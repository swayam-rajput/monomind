import { prisma } from "@monome/db";
import type { ImportSummary, ImportWarning, ParsedConversation } from "@monome/types";

/**
 * Writes parsed conversations to SQLite as the immutable raw layer.
 * No transformation, summarization, or embedding happens here - just a
 * faithful store of what was parsed. Each conversation + its messages are
 * written in a single transaction so a failure partway through a
 * conversation can't leave orphaned messages.
 *
 * Conversations that fail to parse (passed in via `preSkipped`) are folded
 * into the same summary so the caller gets one combined report.
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

  for (const conversation of parsedConversations) {
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
          // Fall back to "now" if the source had no timestamp for this message.
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        })),
      },
    },
    select: { id: true },
  });

  return created.id;
}
