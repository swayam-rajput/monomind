import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monome/db";

export const runtime = "nodejs";

/** Manual edit - persists exactly what the user typed, never re-triggers AI generation. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { titleOverride, summary, topics, keyIdeas, decisions, openQuestions } = body as {
    titleOverride?: string | null;
    summary?: string;
    topics?: string[];
    keyIdeas?: string[];
    decisions?: string[];
    openQuestions?: string[];
  };

  try {
    const note = await prisma.note.update({
      where: { id: params.id },
      data: {
        ...(titleOverride !== undefined && { titleOverride }),
        ...(summary !== undefined && { summary }),
        ...(topics !== undefined && { topics }),
        ...(keyIdeas !== undefined && { keyIdeas }),
        ...(decisions !== undefined && { decisions }),
        ...(openQuestions !== undefined && { openQuestions }),
      },
    });
    return NextResponse.json(note);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update note." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.note.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete note." },
      { status: 500 }
    );
  }
}
