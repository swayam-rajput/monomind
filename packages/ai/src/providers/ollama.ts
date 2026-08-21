import type { LLMProvider } from "../provider";

/**
 * Local AI provider backed by Ollama (http://localhost:11434 by default).
 * Uses `llama3.1:8b` for chat and `nomic-embed-text` for embeddings.
 * This is the zero-configuration default - no API key, no network egress.
 *
 * Note: llama3.1:8b is a ~4.9GB model. On memory-constrained machines it
 * can be slow to load or fail to allocate GPU memory entirely. If that
 * happens, pass a lighter model you already have pulled (e.g. "mistral",
 * "qwen2.5-coder") as the chatModel argument.
 */
export class OllamaProvider implements LLMProvider {
  readonly name = "Ollama (local)";

  constructor(
    private readonly baseUrl: string = "http://localhost:11434",
    readonly chatModel: string = "llama3.1:8b",
    readonly embedModel: string = "nomic-embed-text"
  ) {}

  async chat(prompt: string): Promise<string> {
    const body = await this.post("/api/generate", {
      model: this.chatModel,
      prompt,
      stream: false,
    });
    if (typeof body.response !== "string") {
      throw new Error("Ollama returned an unexpected response shape for /api/generate.");
    }
    return body.response;
  }

  async *chatStream(prompt: string): AsyncIterable<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.chatModel, prompt, stream: true }),
      });
    } catch {
      throw new Error("Ollama isn't running — start it and try again.");
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      if (res.status === 404 && /model.*not found/i.test(text)) {
        throw new Error(`Ollama model not found. Run "ollama pull ${this.chatModel}" and try again.`);
      }
      throw new Error(`Ollama request to /api/generate failed (${res.status}): ${text || res.statusText}`);
    }

    // Ollama streams newline-delimited JSON objects, one per token(s):
    // {"response": "...", "done": false} ... {"done": true, ...stats}
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
        if (!line) continue;

        const parsed = JSON.parse(line);
        if (typeof parsed.response === "string" && parsed.response.length > 0) {
          yield parsed.response;
        }
        if (parsed.done) return;
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const body = await this.post("/api/embed", {
      model: this.embedModel,
      input: text,
    });
    const vector = body.embeddings?.[0];
    if (!Array.isArray(vector)) {
      throw new Error("Ollama returned an unexpected response shape for /api/embed.");
    }
    return vector;
  }

  private async post(path: string, payload: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // ECONNREFUSED (or any fetch-level network failure) means Ollama's
      // HTTP server isn't up. This is the most common failure mode for a
      // local-first tool, so give a specific, actionable message.
      throw new Error("Ollama isn't running — start it and try again.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 404 && /model.*not found/i.test(text)) {
        throw new Error(
          `Ollama model not found. Run "ollama pull ${
            path.includes("embed") ? this.embedModel : this.chatModel
          }" and try again.`
        );
      }
      throw new Error(`Ollama request to ${path} failed (${res.status}): ${text || res.statusText}`);
    }

    return res.json();
  }
}
