import { NextRequest, NextResponse } from "next/server";
import { embedConversation } from "@/lib/embed/embedConversation";
import { getActiveProvider } from "@monomind/ai";

export const runtime = "nodejs";

/**
 * Embeds ONE conversation per request. Deliberately one-at-a-time rather
 * than looping over all conversations server-side in a single call: the
 * client drives the loop so it can show "Embedding conversation N of M..."
 * progress and isn't stuck waiting on one giant unbounded request.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId } = body as { conversationId?: string };

  if (!conversationId) {
    return NextResponse.json({ error: "'conversationId' is required." }, { status: 400 });
  }

  try {
    const provider = getActiveProvider();
    const result = await embedConversation(conversationId, provider);
    return NextResponse.json({ conversationId, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Embedding failed." },
      { status: 500 }
    );
  }
}
