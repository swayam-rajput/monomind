import { NextResponse } from "next/server";
import { prisma } from "@monomind/db";

export const runtime = "nodejs";

/**
 * Deletes ALL conversations and their children (messages, chunks, notes)
 * via cascade. LanceDB vector rows are orphaned but don't affect
 * correctness - they'll take up disk until the data/lancedb directory is
 * manually cleared.
 */
export async function DELETE() {
  try {
    const { count } = await prisma.conversation.deleteMany({});
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete conversations." },
      { status: 500 }
    );
  }
}
