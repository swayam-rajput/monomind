import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { AiProviderKind } from "@monomind/types";

/**
 * Local settings file for which AI backend is active, and (if BYOK) the
 * API key to use. Lives at ~/.monomind/config.json - outside the repo, never
 * committed, never sent anywhere except directly to the chosen provider's
 * API. This is intentionally NOT stored in SQLite: it's a machine-level
 * preference, not app data.
 */
export interface MonomindConfig {
  /** Which provider is currently active. Defaults to "ollama" (zero-config). */
  provider: AiProviderKind;
  /** API key for the active BYOK provider, if any. Ignored when provider is "ollama". */
  apiKey?: string;
  /** Optional overrides, mainly useful for testing against a non-default Ollama host. */
  ollamaBaseUrl?: string;
  /** Chat model to use with Ollama. Defaults to "llama3.1:8b". */
  ollamaChatModel?: string;
  /** Embedding model to use with Ollama. Defaults to "nomic-embed-text". */
  ollamaEmbedModel?: string;
}

const DEFAULT_CONFIG: MonomindConfig = {
  provider: "ollama",
};

function configDir(): string {
  return join(homedir(), ".monomind");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

/** Reads the local config file, falling back to defaults if it doesn't exist yet or is invalid. */
export function readConfig(): MonomindConfig {
  const path = configPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    // Corrupt config file - don't crash the app over a settings file,
    // just fall back to defaults (Ollama, zero-config).
    return { ...DEFAULT_CONFIG };
  }
}

/** Writes the local config file, creating ~/.monomind if needed. */
export function writeConfig(config: MonomindConfig): void {
  const dir = configDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
}
