import { NextResponse } from "next/server";
import { prisma } from "@monome/db";

export const runtime = "nodejs";

/**
 * Lists conversations that have zero notes - used to backfill note
 * generation for conversations imported before note generation ran (or
 * that failed at import time, e.g. because the AI provider was
 * unreachable). The client drives the actual generation one conversation
 * at a time via /api/notes/generate, same pattern as the import flow's
 * progress bar.
 */
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    where: { notes: { none: {} } },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ conversations });
}
