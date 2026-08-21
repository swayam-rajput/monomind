/**
 * The provider-agnostic AI interface. Every backend (Ollama, OpenAI,
 * Anthropic, Gemini) implements this same shape, so the rest of the app
 * never needs to know which one is active. Swapping providers = swapping
 * the implementation passed in here, nothing else changes.
 *
 * Deliberately tiny: one string in, one string/vector out. Batching (e.g.
 * embedding many chunks) happens by calling embed() repeatedly through the
 * rate limiter, not by widening this interface.
 */
export interface LLMProvider {
  /** Human-readable name, shown in Settings. */
  readonly name: string;

  /** The chat/completion model this provider is using. */
  readonly chatModel: string;

  /** The embedding model this provider is using. */
  readonly embedModel: string;

  /** Send a single prompt, get back the model's text response. */
  chat(prompt: string): Promise<string>;

  /**
   * Same as chat(), but yields the response incrementally as it's
   * generated. Every provider implements this - if the underlying API
   * doesn't support streaming, the implementation just yields the full
   * response as a single chunk, so callers never need a special case.
   */
  chatStream(prompt: string): AsyncIterable<string>;

  /** Embed a single piece of text, get back its vector. */
  embed(text: string): Promise<number[]>;
}
