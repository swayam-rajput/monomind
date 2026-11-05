import { NextResponse } from "next/server";
import { prisma } from "@monomind/db";

export const runtime = "nodejs";

/** Used by /search to distinguish "empty database" from "no matches for this query." */
export async function GET() {
  const count = await prisma.conversation.count();
  return NextResponse.json({ count });
}
