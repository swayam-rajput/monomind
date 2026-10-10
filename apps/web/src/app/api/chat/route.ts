import { NextRequest } from "next/server";
import { prisma, searchChunks } from "@monome/db";
import { getActiveProvider, buildRagPrompt, extractCitedIndexes, type EvidenceItem } from "@monome/ai";
import type { Conversation } from "@prisma/client";

export const runtime = "nodejs";

const RETRIEVAL_LIMIT = 8;
// Cosine distance above this is treated as "not actually relevant" - see
// Phase 5 verification, unrelated content landed around 0.6+ while genuine
// matches landed under 0.5. Conservative cutoff: better to under-answer
// than to hand the model tangential evidence and let it stretch to use it.
const RELEVANCE_DISTANCE_CUTOFF = 0.7;

const NO_EVIDENCE_MESSAGE = "I couldn't find anything relevant in your imported conversations.";

/**
 * Streams a grounded answer to `question`: retrieves evidence via Phase
 * 5's search (embed query -> cosine search in LanceDB -> join SQLite),
 * and if there's nothing relevant, returns the "no evidence" message
 * directly WITHOUT calling the chat model at all - cheaper, faster, and
 * removes any chance of the model ignoring the "say you don't know" rule.
 *
 * Response is streamed as newline-delimited JSON events:
 *   {"type": "citations", "citations": [...]}   (sent once, first)
 *   {"type": "chunk", "text": "..."}             (repeated as tokens arrive)
 *   {"type": "done"}                             (sent once, last)
 *   {"type": "error", "error": "..."}            (only on failure)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question, sessionId } = body as { question?: string; sessionId?: string };

  if (!question || question.trim().length === 0) {
    return new Response(JSON.stringify({ error: "'question' is required." }), { status: 400 });
  }
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "'sessionId' is required." }), { status: 400 });
  }

  const provider = getActiveProvider();

  // Persist the user's question immediately, before doing anything AI-
  // related - so it survives a refresh even if retrieval/generation fails.
  await prisma.chatMessage.create({
    data: { sessionId, role: "user", content: question },
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));

      try {
        const queryVector = await provider.embed(question);
        const hits = await searchChunks(provider.embedModel, queryVector, RETRIEVAL_LIMIT);
        const relevantHits = hits.filter((h) => h.distance <= RELEVANCE_DISTANCE_CUTOFF);

        if (relevantHits.length === 0) {
          send({ type: "citations", citations: [] });
          send({ type: "chunk", text: NO_EVIDENCE_MESSAGE });
          send({ type: "done" });
          await prisma.chatMessage.create({
            data: { sessionId, role: "assistant", content: NO_EVIDENCE_MESSAGE, citations: "[]" },
          });
          controller.close();
          return;
        }

        const conversationIds = Array.from(new Set(relevantHits.map((h) => h.conversationId)));
        const conversations = await prisma.conversation.findMany({ where: { id: { in: conversationIds } } });
        const conversationById = new Map(conversations.map((c: { id: string, title: string, createdAt: Date }) => [c.id, c]));

        const evidence: EvidenceItem[] = relevantHits
          .map((hit, i) => {
            const conversation = conversationById.get(hit.conversationId);
            if (!conversation) return null;
            return {
              index: i + 1,
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              conversationCreatedAt: conversation.createdAt.toISOString(),
              text: hit.text,
              messageId: hit.startMessageId,
            };
          })
          .filter((e): e is EvidenceItem => e !== null);

        const prompt = buildRagPrompt(question, evidence);

        let fullAnswer = "";
        for await (const piece of provider.chatStream(prompt)) {
          fullAnswer += piece;
          send({ type: "chunk", text: piece });
        }

        // Only cite evidence the model actually referenced in its answer,
        // not everything we retrieved.
        const citedIndexes = new Set(extractCitedIndexes(fullAnswer));
        const citations = evidence
          .filter((e) => citedIndexes.has(e.index))
          .map((e) => ({
            index: e.index,
            conversationId: e.conversationId,
            conversationTitle: e.conversationTitle,
            messageId: e.messageId,
          }));

        send({ type: "citations", citations });
        send({ type: "done" });

        await prisma.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: fullAnswer,
            citations: JSON.stringify(citations),
          },
        });

        controller.close();
      } catch (err) {
        // Persist a record of the failure too, so a refresh doesn't just
        // make the question look like it went unanswered with no
        // explanation.
        const errorMessage = err instanceof Error ? err.message : "Chat failed.";
        send({ type: "error", error: errorMessage });
        await prisma.chatMessage
          .create({
            data: { sessionId, role: "assistant", content: `Error: ${errorMessage}`, citations: "[]" },
          })
          .catch(() => {
            // If even saving the error fails, there's nothing more useful
            // we can do here - the stream has already reported the error
            // to the client.
          });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
