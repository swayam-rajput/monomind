import { NextResponse } from "next/server";
import { prisma } from "@monome/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/** Used by /search to distinguish "empty database" from "no matches for this query." */
export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("monomind_user_id")?.value ?? "00000000-0000-0000-0000-000000000000";
  const count = await prisma.conversation.count({ where: { userId } });
  return NextResponse.json({ count });
}
