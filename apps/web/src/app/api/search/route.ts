import { NextRequest, NextResponse } from "next/server";
import { prisma, searchChunks } from "@monome/db";
import { getActiveProvider } from "@monome/ai";

export const runtime = "nodejs";

const RESULT_LIMIT = 15;

export interface SearchApiResult {
  chunkId: string;
  conversationId: string;
  conversationTitle: string;
  conversationCreatedAt: string;
  snippet: string;
  distance: number;
  note: {
    titleOverride: string | null;
    summary: string;
  } | null;
}

/**
 * Embeds the query through the active provider, runs a cosine-similarity
 * nearest-neighbor search in LanceDB, then joins each hit back to its
 * source Conversation (and Note, if one exists) in SQLite.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query } = body as { query?: string };

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: "'query' is required." }, { status: 400 });
  }

  try {
    const provider = getActiveProvider();
    const queryVector = await provider.embed(query);
    const hits = await searchChunks(provider.embedModel, queryVector, RESULT_LIMIT);

    if (hits.length === 0) {
      return NextResponse.json({ results: [] satisfies SearchApiResult[] });
    }

    const conversationIds = Array.from(new Set(hits.map((h) => h.conversationId)));
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: { notes: true },
    });
    const conversationById = new Map(conversations.map((c) => [c.id, c]));

    const results: SearchApiResult[] = hits
      .map((hit) => {
        const conversation = conversationById.get(hit.conversationId);
        // A chunk whose parent conversation was deleted after embedding -
        // skip rather than showing a broken result.
        if (!conversation) return null;

        const note = conversation.notes[0] ?? null;

        return {
          chunkId: hit.id,
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          conversationCreatedAt: conversation.createdAt.toISOString(),
          snippet: hit.text,
          distance: hit.distance,
          note: note ? { titleOverride: note.titleOverride, summary: note.summary } : null,
        };
      })
      .filter((r): r is SearchApiResult => r !== null);

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 500 }
    );
  }
}
