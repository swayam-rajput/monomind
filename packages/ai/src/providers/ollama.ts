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
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Cannot generate chat response for empty prompt");
    }
    
    // First attempt with conservative parameters for JSON generation
    try {
      const body = await this.post("/api/generate", {
        model: this.chatModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.8,
          repeat_penalty: 1.1,
          num_predict: 2000, // Ensure enough tokens for full JSON response
          stop: [], // Don't use any stop tokens that might truncate JSON
        }
      });
      
      if (typeof body.response !== "string") {
        throw new Error("Ollama returned an unexpected response shape for /api/generate.");
      }
      
      if (body.response.trim().length === 0) {
        throw new Error(`Ollama returned empty response. Model: ${this.chatModel}. This often indicates the model failed to generate content or hit a constraint.`);
      }
      
      return body.response;
    } catch (err) {
      // If the first attempt fails with empty response, try with different parameters
      if (err instanceof Error && err.message.includes("empty response")) {
        console.warn("First attempt returned empty response, retrying with different parameters...");
        
        const retryBody = await this.post("/api/generate", {
          model: this.chatModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            repeat_penalty: 1.0,
            num_predict: 3000,
            num_ctx: 4096, // Increase context window
          }
        });
        
        if (typeof retryBody.response !== "string" || retryBody.response.trim().length === 0) {
          throw new Error(`Ollama consistently returns empty responses for model ${this.chatModel}. Check if the model is properly loaded and functioning.`);
        }
        
        return retryBody.response;
      }
      
      throw err;
    }
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
    // Validate input before sending to Ollama
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot embed empty text");
    }
    
    if (text.length > 32000) {
      throw new Error(`Text too long for embedding: ${text.length} characters (limit: 32000)`);
    }

    const body = await this.post("/api/embed", {
      model: this.embedModel,
      input: text,
    });
    
    const vector = body.embeddings?.[0];
    if (!Array.isArray(vector)) {
      throw new Error("Ollama returned an unexpected response shape for /api/embed.");
    }
    
    if (vector.length === 0) {
      throw new Error("Ollama returned empty embedding vector");
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
      
      // Check for common Ollama error patterns
      if (res.status === 500 && text.includes("out of memory")) {
        throw new Error(`Ollama ran out of memory. Try using a smaller model or reduce the input size.`);
      }
      
      if (res.status === 400 && text.includes("invalid")) {
        throw new Error(`Invalid request to Ollama. This may indicate a problem with the model or parameters.`);
      }
      
      throw new Error(`Ollama request to ${path} failed (${res.status}): ${text || res.statusText}`);
    }

    const result = await res.json();
    
    // Additional validation for generate endpoint
    if (path.includes("/api/generate") && result && typeof result.response === "string") {
      // Check if the model indicates it's done but with empty content
      if (result.done === true && result.response.trim().length === 0) {
        throw new Error(`Model ${this.chatModel} completed but generated no content. This may indicate the prompt was too restrictive or the model encountered an issue.`);
      }
    }
    
    return result;
  }
}
