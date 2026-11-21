import { prisma } from "@monome/db";
import type { ImportSummary, ImportWarning, ParsedConversation } from "@monome/types";

/**
 * Writes parsed conversations to SQLite as the immutable raw layer.
 *
 * Duplicate detection: a conversation is a duplicate if a record with the
 * same title, source, AND message count already exists. Title-only dedup
 * has too many false positives ("New chat" is extremely common); combining
 * all three keeps it practical.
 */
export async function persistParsedConversations(
  parsedConversations: ParsedConversation[],
  preSkipped: { identifier: string; reason: string }[] = []
): Promise<ImportSummary> {
  const warnings: ImportWarning[] = preSkipped.map((s) => ({
    identifier: s.identifier,
    reason: s.reason,
  }));
  const importedConversationIds: string[] = [];
  let duplicateCount = 0;

  for (const conversation of parsedConversations) {
    // Fetch candidates with the same title+source, then check message count
    // in JS — Prisma v5 doesn't support filtering by relation aggregate
    // count in a where clause without raw SQL.
    const candidates = await prisma.conversation.findMany({
      where: { title: conversation.title, source: conversation.source },
      include: { _count: { select: { messages: true } } },
    });

    const isDuplicate = candidates.some(
      (c) => c._count.messages === conversation.messages.length
    );

    if (isDuplicate) {
      duplicateCount++;
      warnings.push({
        identifier: conversation.title,
        reason: `Already imported (${conversation.messages.length} messages). Skipped.`,
      });
      continue;
    }

    try {
      const id = await persistOne(conversation);
      importedConversationIds.push(id);
    } catch (err) {
      warnings.push({
        identifier: conversation.title,
        reason: err instanceof Error ? err.message : "Unknown error while saving to the database.",
      });
    }
  }

  return {
    importedCount: importedConversationIds.length,
    skippedCount: warnings.length,
    duplicateCount,
    warnings,
    importedConversationIds,
  };
}

async function persistOne(conversation: ParsedConversation): Promise<string> {
  const created = await prisma.conversation.create({
    data: {
      title: conversation.title,
      source: conversation.source,
      messages: {
        create: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        })),
      },
    },
    select: { id: true },
  });

  return created.id;
}
