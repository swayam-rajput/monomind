import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, validateOpenAiKey, type MonomeConfig } from "@monome/ai";

export const runtime = "nodejs";

// Never echo the API key back in responses - only report whether one is set.
function toClientSafeConfig(config: MonomeConfig) {
  return {
    provider: config.provider,
    hasApiKey: Boolean(config.apiKey),
    ollamaBaseUrl: config.ollamaBaseUrl,
  };
}

export async function GET() {
  return NextResponse.json(toClientSafeConfig(readConfig()));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, apiKey } = body as { provider: string; apiKey?: string };

  if (!["ollama", "openai", "anthropic", "gemini"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  if (provider === "ollama") {
    writeConfig({ provider: "ollama" });
    return NextResponse.json(toClientSafeConfig(readConfig()));
  }

  // BYOK path: validate the key with one cheap call before saving it.
  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "An API key is required for BYOK providers." }, { status: 400 });
  }

  if (provider === "openai") {
    const result = await validateOpenAiKey(apiKey.trim());
    if (!result.valid) {
      return NextResponse.json({ error: result.error ?? "Key validation failed." }, { status: 400 });
    }
  } else {
    // Anthropic/Gemini providers aren't implemented yet - don't let the
    // user save a key we can't actually use.
    return NextResponse.json(
      { error: `${provider} isn't wired up yet in this build. Use Ollama or OpenAI for now.` },
      { status: 400 }
    );
  }

  writeConfig({ provider: provider as "openai", apiKey: apiKey.trim() });
  return NextResponse.json(toClientSafeConfig(readConfig()));
}
