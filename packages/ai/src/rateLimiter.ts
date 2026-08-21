/**
 * Simple token-bucket-style rate limiter shared by all AI providers (Ollama
 * and BYOK). Caps how many requests run at once and adds a small delay
 * between the start of each request, so a bulk import doesn't choke local
 * Ollama or blow through a free-tier API's per-minute quota.
 */
export interface RateLimiterOptions {
  /** Max number of requests allowed to run at the same time. */
  maxConcurrent: number;
  /** Minimum delay (ms) between the start of consecutive requests. */
  minDelayMs: number;
}

export class RateLimiter {
  private activeCount = 0;
  private lastStartedAt = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly options: RateLimiterOptions) {}

  /** Runs `fn`, queueing it behind the concurrency/delay limits. */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    try {
      return await fn();
    } finally {
      this.activeCount--;
      this.releaseNext();
    }
  }

  /**
   * Like schedule(), but for long-lived work (streaming) that can't be
   * expressed as a single awaited Promise. Waits for a free slot, then
   * returns a release function the caller MUST call exactly once when
   * done, however the work finishes (success, error, or early return).
   */
  async acquireSlot(): Promise<() => void> {
    await this.waitForSlot();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeCount--;
      this.releaseNext();
    };
  }

  private async waitForSlot(): Promise<void> {
    // Wait for a free concurrency slot.
    if (this.activeCount >= this.options.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;

    // Enforce a minimum delay between the start of consecutive requests.
    const now = Date.now();
    const elapsed = now - this.lastStartedAt;
    if (elapsed < this.options.minDelayMs) {
      await sleep(this.options.minDelayMs - elapsed);
    }
    this.lastStartedAt = Date.now();
  }

  private releaseNext(): void {
    const next = this.queue.shift();
    if (next) next();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
