import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@monome/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * Deletes a conversation and all its children (messages, chunks, notes)
 * via Prisma's cascade-delete (defined in schema.prisma). The LanceDB
 * vector rows for this conversation's chunks are NOT cleaned up here
 * because LanceDB doesn't support targeted row deletion by a filter that
 * scales cleanly in all cases — the orphaned vectors take up disk space
 * but don't affect search correctness (they'll never be joined back to a
 * real conversation).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value ?? "00000000-0000-0000-0000-000000000000";

  try {
    await prisma.conversation.delete({ where: { id: params.id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete conversation." },
      { status: 500 }
    );
  }
}
