import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monomind/db";
import { generateNoteForConversation } from "@/lib/notes/generateNotes";
import { getActiveProvider } from "@monomind/ai";

export const runtime = "nodejs";

/**
 * Explicitly re-runs AI generation for a note, overwriting the current
 * content. Only ever called when the user clicks "Regenerate" - editing a
 * note's fields directly (PATCH /api/notes/[id]) never triggers this.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  try {
    const provider = getActiveProvider();
    const result = await generateNoteForConversation(note.conversationId, provider);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const updated = await prisma.note.findUnique({ where: { id: result.noteId } });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Regeneration failed." },
      { status: 500 }
    );
  }
}
