import { NextResponse } from "next/server";
import { getActiveProvider } from "@monome/ai";

export const runtime = "nodejs";

/** Tests the CURRENTLY ACTIVE provider with a tiny embed call, for a live "is this actually working" check in Settings. */
export async function GET() {
  try {
    const provider = getActiveProvider();
    await provider.embed("connection test");
    return NextResponse.json({ ok: true, provider: provider.name });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Test failed." });
  }
}
