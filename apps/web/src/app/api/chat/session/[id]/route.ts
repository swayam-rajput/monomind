import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monome/db";

export const runtime = "nodejs";

/** Returns one chat session's full message history. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await prisma.chatSession.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: JSON.parse(m.citations),
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

/** Deletes a chat session and all its messages (cascade, per schema). */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.chatSession.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete session." },
      { status: 500 }
    );
  }
}
