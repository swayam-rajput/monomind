import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monomind/db";

export const runtime = "nodejs";

/**
 * Returns one conversation's messages and note, for the /chat page's
 * "skim the source" side panel - lets the user peek at where a citation
 * came from without leaving the chat.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      notes: true,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const note = conversation.notes[0] ?? null;

  return NextResponse.json({
    id: conversation.id,
    title: note?.titleOverride ?? conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
