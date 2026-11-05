import { NextRequest, NextResponse } from "next/server";
import { generateNoteForConversation } from "@/lib/notes/generateNotes";
import { getActiveProvider } from "@monomind/ai";

export const runtime = "nodejs";

/**
 * Generates a Note for ONE conversation per request, same one-at-a-time
 * pattern as /api/embed - the client drives the loop so it can show its
 * own "Generating notes for conversation N of M..." progress bar.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId } = body as { conversationId?: string };

  if (!conversationId) {
    return NextResponse.json({ error: "'conversationId' is required." }, { status: 400 });
  }

  try {
    const provider = getActiveProvider();
    const result = await generateNoteForConversation(conversationId, provider);

    if (!result.ok) {
      // Not a 500 - this is an expected, handled outcome (bad JSON from
      // the model, etc), reported the same way per-chunk embed failures
      // are: as a normal response the client can log and move past.
      console.error(`Note generation failed for conversation ${conversationId}: ${result.error}`);
      return NextResponse.json({ conversationId, ok: false, error: result.error });
    }

    return NextResponse.json({ conversationId, ok: true, noteId: result.noteId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Note generation failed." },
      { status: 500 }
    );
  }
}
