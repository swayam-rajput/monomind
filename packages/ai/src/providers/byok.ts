import type { LLMProvider } from "../provider";

/**
 * "Bring your own key" providers. Each one implements the same LLMProvider
 * interface as Ollama, so the rest of the app doesn't care which is active.
 *
 * Only OpenAI is implemented for now. Anthropic and Gemini are stubbed with
 * the same shape (constructor takes an apiKey, implements chat/embed) so
 * adding them later is a matter of filling in the HTTP calls, not
 * restructuring anything.
 */

export class OpenAiProvider implements LLMProvider {
  readonly name = "OpenAI (BYOK)";
  readonly chatModel = "gpt-4o-mini";
  readonly embedModel = "text-embedding-3-small";

  constructor(private readonly apiKey: string) {}

  async chat(prompt: string): Promise<string> {
    const res = await this.post("https://api.openai.com/v1/chat/completions", {
      model: this.chatModel,
      messages: [{ role: "user", content: prompt }],
    });
    const content = res.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI returned an unexpected response shape for chat completions.");
    }
    return content;
  }

  async *chatStream(prompt: string): AsyncIterable<string> {
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.chatModel,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }),
      });
    } catch {
      throw new Error("Couldn't reach OpenAI. Check your internet connection and try again.");
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error("OpenAI rejected the API key (401 Unauthorized). Check the key in Settings.");
      }
      throw new Error(`OpenAI request failed (${res.status}): ${text || res.statusText}`);
    }

    // OpenAI streams Server-Sent Events: lines like "data: {...}" ending
    // with a literal "data: [DONE]".
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;

        const data = line.slice("data:".length).trim();
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            yield delta;
          }
        } catch {
          // Ignore malformed SSE chunks rather than aborting the stream.
        }
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.post("https://api.openai.com/v1/embeddings", {
      model: this.embedModel,
      input: text,
    });
    const vector = res.data?.[0]?.embedding;
    if (!Array.isArray(vector)) {
      throw new Error("OpenAI returned an unexpected response shape for embeddings.");
    }
    return vector;
  }

  private async post(url: string, payload: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error("Couldn't reach OpenAI. Check your internet connection and try again.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error("OpenAI rejected the API key (401 Unauthorized). Check the key in Settings.");
      }
      if (res.status === 429) {
        throw new Error("OpenAI rate limit hit (429). Slow down or check your plan's quota.");
      }
      throw new Error(`OpenAI request failed (${res.status}): ${text || res.statusText}`);
    }

    return res.json();
  }
}

/**
 * Runs one cheap call to confirm an API key actually works before saving
 * it to the local config file. Uses the models list endpoint - free,
 * doesn't consume tokens.
 */
export async function validateOpenAiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401) {
      return { valid: false, error: "That key was rejected by OpenAI (401 Unauthorized)." };
    }
    if (!res.ok) {
      return { valid: false, error: `OpenAI returned an unexpected error (${res.status}).` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Couldn't reach OpenAI to validate the key. Check your internet connection." };
  }
}

// --- Not implemented yet, same shape as OpenAiProvider for easy follow-up ---

export class AnthropicProvider implements LLMProvider {
  readonly name = "Anthropic (BYOK)";
  readonly chatModel = "claude-3-5-sonnet-latest";
  readonly embedModel = "none"; // Anthropic has no embeddings API; would need a fallback.

  constructor(private readonly apiKey: string) {}

  async chat(_prompt: string): Promise<string> {
    throw new Error("Anthropic provider not implemented yet.");
  }

  // eslint-disable-next-line require-yield
  async *chatStream(_prompt: string): AsyncIterable<string> {
    throw new Error("Anthropic provider not implemented yet.");
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      "Anthropic has no embeddings API. Pick OpenAI or Ollama for embeddings, or use Anthropic for chat only (not wired up yet)."
    );
  }
}

export class GeminiProvider implements LLMProvider {
  readonly name = "Gemini (BYOK)";
  readonly chatModel = "gemini-1.5-flash";
  readonly embedModel = "text-embedding-004";

  constructor(private readonly apiKey: string) {}

  async chat(_prompt: string): Promise<string> {
    throw new Error("Gemini provider not implemented yet.");
  }

  // eslint-disable-next-line require-yield
  async *chatStream(_prompt: string): AsyncIterable<string> {
    throw new Error("Gemini provider not implemented yet.");
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error("Gemini provider not implemented yet.");
  }
}
