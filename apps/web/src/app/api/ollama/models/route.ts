import { NextResponse } from "next/server";
import { readConfig } from "@monome/ai";

export const runtime = "nodejs";

/**
 * Proxies GET /api/tags from the local Ollama instance so the Settings page
 * can populate a model picker without the browser making a cross-origin
 * request to localhost:11434 (which most browsers block or flag).
 */
export async function GET() {
  const config = readConfig();
  const baseUrl = config.ollamaBaseUrl ?? "http://localhost:11434";

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Ollama returned ${res.status}. Is it running?` },
        { status: 502 }
      );
    }

    const data = await res.json();
    // Ollama returns: { models: [{ name, model, details, ... }] }
    const names: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
    return NextResponse.json({ models: names });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.name === "TimeoutError"
            ? "Ollama didn't respond in 4 s — is it running?"
            : "Couldn't reach Ollama. Make sure it's running at localhost:11434.",
      },
      { status: 503 }
    );
  }
}
