import { NextRequest, NextResponse } from "next/server";
import { retryFailedChunks } from "@/lib/embed/embedConversation";
import { getActiveProvider } from "@monomind/ai";

export const runtime = "nodejs";

/** Re-embeds only the chunks currently marked "failed" for one conversation. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId } = body as { conversationId?: string };

  if (!conversationId) {
    return NextResponse.json({ error: "'conversationId' is required." }, { status: 400 });
  }

  try {
    const provider = getActiveProvider();
    const result = await retryFailedChunks(conversationId, provider);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Retry failed." },
      { status: 500 }
    );
  }
}
