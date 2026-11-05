import { NextResponse } from "next/server";
import { prisma } from "@monomind/db";

export const runtime = "nodejs";

/**
 * Lists all chat sessions (most recent first), each with a preview of its
 * first user message so the sidebar can show a meaningful title instead
 * of a bare id - same idea as ChatGPT's sidebar list.
 */
export async function GET() {
  const sessions = await prisma.chatSession.findMany({
    // "New chat" creates an empty session row immediately (so a message
    // can be posted to it), but an empty thread shouldn't clutter the
    // sidebar as a visible entry until it actually has content - this is
    // purely a list-visibility filter, the row itself still exists.
    where: { messages: { some: {} } },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  // Sort/label by last activity, not thread creation time - a thread you
  // replied to 5 minutes ago should read as recent even if it was first
  // created days ago.
  const withLastActivity = await Promise.all(
    sessions.map(async (s) => {
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { sessionId: s.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      return {
        id: s.id,
        preview: s.messages[0]?.content.slice(0, 60) ?? "New chat",
        lastActivityAt: (lastMessage?.createdAt ?? s.createdAt).toISOString(),
      };
    })
  );

  withLastActivity.sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));

  return NextResponse.json({ sessions: withLastActivity });
}

/** Creates a new, empty chat session - the "New chat" action. */
export async function POST() {
  const session = await prisma.chatSession.create({ data: {} });
  return NextResponse.json({ sessionId: session.id });
}
