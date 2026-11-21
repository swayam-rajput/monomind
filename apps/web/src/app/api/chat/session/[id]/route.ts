import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monome/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/** Returns one chat session's full message history. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value ?? "00000000-0000-0000-0000-000000000000";

  const session = await prisma.chatSession.findUnique({
    where: { id: params.id, userId },
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
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value ?? "00000000-0000-0000-0000-000000000000";

  try {
    await prisma.chatSession.delete({ where: { id: params.id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete session." },
      { status: 500 }
    );
  }
}
