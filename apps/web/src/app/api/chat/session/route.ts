import { NextResponse } from "next/server";
import { prisma } from "@monome/db";

export const runtime = "nodejs";

/**
 * Lists all chat sessions (most recent first), each with a preview of its
 * first user message so the sidebar can show a meaningful title instead
 * of a bare id - same idea as ChatGPT's sidebar list.
 */
export async function GET() {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      preview: s.messages[0]?.content.slice(0, 60) ?? "New chat",
    })),
  });
}

/** Creates a new, empty chat session - the "New chat" action. */
export async function POST() {
  const session = await prisma.chatSession.create({ data: {} });
  return NextResponse.json({ sessionId: session.id });
}
