import { prisma, chunkMessages, upsertChunkVector } from "@monomind/db";
import { getActiveProvider, type LLMProvider } from "@monomind/ai";

/**
 * Chunks one conversation (respecting message boundaries) and embeds each
 * chunk through the active AI provider (already rate-limited by
 * getActiveProvider). Writes chunk metadata + status to SQLite and the
 * actual vector to LanceDB.
 *
 * Per-chunk failures are caught and recorded as "failed" in SQLite rather
 * than aborting the whole conversation - a later retry pass can pick up
 * just the failed ones. This function itself only throws for
 * conversation-level problems (e.g. the conversation doesn't exist), never
 * for a single chunk's embedding failure.
 *
 * Safe to re-run on the same conversation: existing chunk rows (matched by
 * conversationId + order) are updated in place rather than duplicated.
 */
export async function embedConversation(
  conversationId: string,
  provider: LLMProvider = getActiveProvider()
): Promise<{ chunkCount: number; failedCount: number }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found.`);
  }

  const chunkResults = chunkMessages(conversation.messages.map((m) => ({ id: m.id, content: m.content })));

  let failedCount = 0;
  const failedChunkOrders: number[] = [];

  for (const chunk of chunkResults) {
    const existing = await prisma.chunk.findFirst({
      where: { conversationId, order: chunk.order },
      select: { id: true },
    });

    const chunkRecord = existing
      ? await prisma.chunk.update({
          where: { id: existing.id },
          data: {
            text: chunk.text,
            startMessageId: chunk.startMessageId,
            endMessageId: chunk.endMessageId,
            tokenEstimate: chunk.tokenEstimate,
            embeddingModel: provider.embedModel,
            embeddingStatus: "pending",
            error: null,
          },
        })
      : await prisma.chunk.create({
          data: {
            conversationId,
            order: chunk.order,
            text: chunk.text,
            startMessageId: chunk.startMessageId,
            endMessageId: chunk.endMessageId,
            tokenEstimate: chunk.tokenEstimate,
            embeddingModel: provider.embedModel,
            embeddingStatus: "pending",
          },
        });

    await embedAndStoreChunk(chunkRecord.id, conversationId, chunk, provider).catch(() => {
      failedCount++;
      failedChunkOrders.push(chunk.order);
    });
  }

  // Log detailed failure info
  if (failedCount > 0) {
    console.warn(`Embedding partially failed for conversation ${conversationId}: ${failedCount}/${chunkResults.length} chunks failed (orders: ${failedChunkOrders.join(', ')})`);
  }

  return { chunkCount: chunkResults.length, failedCount };
}

/**
 * Embeds a single chunk and stores the vector + status. Never throws to
 * the caller in a way that aborts the batch - always records "failed" in
 * SQLite on error, then rethrows only so the caller's counter can tick.
 */
async function embedAndStoreChunk(
  chunkId: string,
  conversationId: string,
  chunk: { order: number; text: string; startMessageId: string; endMessageId: string; tokenEstimate: number },
  provider: LLMProvider
): Promise<void> {
  try {
    // Add explicit validation before embedding
    if (!chunk.text || chunk.text.trim().length === 0) {
      throw new Error("Chunk text is empty");
    }
    
    if (chunk.tokenEstimate > 8000) {
      throw new Error(`Chunk too large: ${chunk.tokenEstimate} tokens (limit: 8000)`);
    }

    const vector = await provider.embed(chunk.text);

    // Validate vector dimensions
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Invalid embedding vector returned");
    }

    await upsertChunkVector(provider.embedModel, {
      id: chunkId,
      conversationId,
      chunkOrder: chunk.order,
      text: chunk.text,
      startMessageId: chunk.startMessageId,
      endMessageId: chunk.endMessageId,
      tokenEstimate: chunk.tokenEstimate,
      createdAt: new Date().toISOString(),
      vector,
    });

    await prisma.chunk.update({
      where: { id: chunkId },
      data: { embeddingStatus: "done", error: null },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown embedding error.";
    console.error(`Embedding failed for chunk ${chunkId}:`, errorMessage);
    
    await prisma.chunk.update({
      where: { id: chunkId },
      data: {
        embeddingStatus: "failed",
        error: errorMessage,
      },
    });
    throw err;
  }
}

/** Re-embeds only the chunks currently marked "failed" for a conversation. */
export async function retryFailedChunks(
  conversationId: string,
  provider: LLMProvider = getActiveProvider()
): Promise<{ retried: number; stillFailed: number }> {
  const failedChunks = await prisma.chunk.findMany({
    where: { conversationId, embeddingStatus: "failed" },
  });

  let stillFailed = 0;

  for (const chunk of failedChunks) {
    await embedAndStoreChunk(
      chunk.id,
      conversationId,
      {
        order: chunk.order,
        text: chunk.text,
        startMessageId: chunk.startMessageId,
        endMessageId: chunk.endMessageId,
        tokenEstimate: chunk.tokenEstimate,
      },
      provider
    ).catch(() => {
      stillFailed++;
    });
  }

  return { retried: failedChunks.length, stillFailed };
}
