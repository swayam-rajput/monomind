import type { LLMProvider } from "./provider";
import { RateLimiter, type RateLimiterOptions } from "./rateLimiter";

/** Default limits: at most 3 requests in flight, at least 250ms between starts. */
export const DEFAULT_RATE_LIMIT: RateLimiterOptions = {
  maxConcurrent: 3,
  minDelayMs: 250,
};

/**
 * Wraps any LLMProvider with rate limiting, so every chat()/embed() call
 * (from any part of the app) automatically respects the shared
 * concurrency/delay limits. This is what the rest of the app should hold
 * onto - never the raw provider - so nothing can accidentally bypass the
 * limiter during a bulk operation.
 */
export function withRateLimit(provider: LLMProvider, options: RateLimiterOptions = DEFAULT_RATE_LIMIT): LLMProvider {
  const limiter = new RateLimiter(options);

  return {
    name: provider.name,
    chatModel: provider.chatModel,
    embedModel: provider.embedModel,
    chat: (prompt: string) => limiter.schedule(() => provider.chat(prompt)),
    embed: (text: string) => limiter.schedule(() => provider.embed(text)),
    // Streaming can't go through limiter.schedule() directly - that method
    // awaits a Promise, but a stream needs to hold its concurrency slot
    // open for the whole generator's lifetime. acquireSlot()/release()
    // give us that without changing schedule()'s simpler Promise-based API.
    chatStream: async function* (prompt: string) {
      const release = await limiter.acquireSlot();
      try {
        yield* provider.chatStream(prompt);
      } finally {
        release();
      }
    },
  };
}
