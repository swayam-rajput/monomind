import { NextResponse } from "next/server";
import { prisma } from "@monome/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * Deletes ALL conversations and their children (messages, chunks, notes)
 * via cascade for the current user.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value ?? "00000000-0000-0000-0000-000000000000";

  try {
    const { count } = await prisma.conversation.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete conversations." },
      { status: 500 }
    );
  }
}
