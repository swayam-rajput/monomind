import type { LLMProvider } from "./provider";
import { readConfig, type MonomeConfig } from "./config";
import { OllamaProvider } from "./providers/ollama";
import { OpenAiProvider, AnthropicProvider, GeminiProvider } from "./providers/byok";
import { withRateLimit } from "./rateLimitedProvider";

/**
 * Builds the active LLMProvider based on the local config file
 * (~/.monome/config.json), already wrapped in the shared rate limiter.
 * This is the one function the rest of the app should call to get "the
 * current AI provider" - it's the single place that knows how to turn a
 * user's Settings choice into a working provider instance.
 */
export function getActiveProvider(config: MonomeConfig = readConfig()): LLMProvider {
  const raw = buildRawProvider(config);
  return withRateLimit(raw);
}

function buildRawProvider(config: MonomeConfig): LLMProvider {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider(config.ollamaBaseUrl);
    case "openai":
      if (!config.apiKey) {
        throw new Error("BYOK provider is set to OpenAI, but no API key is saved. Add one in Settings.");
      }
      return new OpenAiProvider(config.apiKey);
    case "anthropic":
      if (!config.apiKey) {
        throw new Error("BYOK provider is set to Anthropic, but no API key is saved. Add one in Settings.");
      }
      return new AnthropicProvider(config.apiKey);
    case "gemini":
      if (!config.apiKey) {
        throw new Error("BYOK provider is set to Gemini, but no API key is saved. Add one in Settings.");
      }
      return new GeminiProvider(config.apiKey);
    default:
      throw new Error(`Unknown provider "${config.provider}" in config.`);
  }
}
