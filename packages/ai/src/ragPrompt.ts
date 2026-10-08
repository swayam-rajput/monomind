/**
 * Grounding prompt + citation handling for Phase 6's "ask your knowledge
 * base" chat. The model is asked to cite evidence by number ([1], [2], ...)
 * rather than output links itself - models are unreliable at formatting
 * ids/URLs correctly, so citation resolution stays deterministic code on
 * our side, not something we trust the model to get right.
 */

export interface EvidenceItem {
  /** 1-based index, matches the [N] citation markers in the prompt and answer. */
  index: number;
  conversationId: string;
  conversationTitle: string;
  conversationCreatedAt: string;
  messageId: string;
  text: string;
}

const SYSTEM_INSTRUCTIONS = `You are answering a question using ONLY the evidence provided below, which
was retrieved from the user's own past conversations. This is not general
knowledge - it is a personal knowledge base.

Rules:
1. Base your answer only on the evidence below. Do not add facts, context,
   or conclusions from your own general knowledge, even if you're confident
   they're true.
2. Every claim in your answer must be traceable to at least one numbered
   piece of evidence. Reference evidence by its number, like [1] or [2].
3. If the evidence is thin, tangential, or doesn't actually answer the
   question, say so explicitly instead of guessing or filling gaps.
4. If different pieces of evidence conflict, point out the conflict rather
   than picking one silently.
5. If none of the evidence is relevant, respond exactly with: "I couldn't
   find anything relevant in your imported conversations." Do not attempt
   to answer from general knowledge instead.`;

export function buildRagPrompt(question: string, evidence: EvidenceItem[]): string {
  const evidenceText = evidence
    .map((e) => {
      const date = new Date(e.conversationCreatedAt).toLocaleDateString();
      return `[${e.index}] From "${e.conversationTitle}" (${date}):\n${e.text}`;
    })
    .join("\n\n");

  return `${SYSTEM_INSTRUCTIONS}

Evidence:
${evidenceText}

Question: ${question}

Answer using only the evidence above, with [N] citations for each claim.`;
}

/**
 * Finds which evidence numbers ([1], [2], ...) actually appear in the
 * model's answer text, so the UI can render only the citations the model
 * actually used - not every piece of evidence we retrieved.
 */
export function extractCitedIndexes(answerText: string): number[] {
  const matches = Array.from(answerText.matchAll(/\[(\d+)\]/g));
  const seen = new Set<number>();
  for (const m of matches) {
    seen.add(Number(m[1]));
  }
  return Array.from(seen).sort((a, b) => a - b);
}
