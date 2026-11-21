import { NextResponse } from "next/server";
import { prisma } from "@monome/db";

export const runtime = "nodejs";

/**
 * Builds 2-3 example questions grounded in the user's actual imported
 * data (recent conversation titles/topics), for the chat empty state's
 * suggestion chips - so they're concretely useful instead of generic
 * "Weather/Code/Write" placeholders.
 */
export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { conversation: { select: { title: true } } },
  });

  const suggestions: string[] = [];

  if (notes.length > 0) {
    const topics = new Set<string>();
    for (const note of notes) {
      for (const t of JSON.parse(note.topics) as string[]) topics.add(t);
    }
    const firstTopic = Array.from(topics)[0];
    if (firstTopic) suggestions.push(`What have I discussed about ${firstTopic}?`);

    const recentTitle = notes[0].titleOverride ?? notes[0].conversation.title;
    suggestions.push(`Summarize what I covered in "${recentTitle}"`);
  }

  suggestions.push("What decisions have I made recently?");
  if (suggestions.length < 3) suggestions.push("What open questions haven't I resolved yet?");

  return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
}
