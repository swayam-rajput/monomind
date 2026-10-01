"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

type ProviderChoice = "ollama" | "openai";

interface ClientConfig {
  provider: string;
  hasApiKey: boolean;
  ollamaChatModel: string;
  ollamaEmbedModel: string;
  ollamaBaseUrl: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [provider, setProvider] = useState<ProviderChoice>("ollama");
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState("llama3.1:8b");
  const [embedModel, setEmbedModel] = useState("nomic-embed-text");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((c: ClientConfig) => {
        setConfig(c);
        if (c.provider === "ollama" || c.provider === "openai") setProvider(c.provider as ProviderChoice);
        setChatModel(c.ollamaChatModel ?? "llama3.1:8b");
        setEmbedModel(c.ollamaEmbedModel ?? "nomic-embed-text");
        setOllamaBaseUrl(c.ollamaBaseUrl ?? "");
      })
      .catch(() => toast.error("Failed to load settings."));
  }, []);

  async function fetchOllamaModels() {
    setFetchingModels(true);
    const toastId = toast.loading("Fetching models from Ollama…");
    try {
      const res = await fetch("/api/ollama/models");
      const body = await res.json();
      if (!res.ok) {
        toast.error("Could not fetch models", { id: toastId, description: body.error });
        return;
      }
      setAvailableModels(body.models as string[]);
      toast.success(`Found ${body.models.length} model${body.models.length === 1 ? "" : "s"}`, { id: toastId });
    } catch {
      toast.error("Could not reach Ollama", { id: toastId });
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading(provider === "openai" ? "Validating API key…" : "Saving…");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: provider === "openai" ? apiKey : undefined,
          ollamaChatModel: provider === "ollama" ? chatModel.trim() : undefined,
          ollamaEmbedModel: provider === "ollama" ? embedModel.trim() : undefined,
          ollamaBaseUrl: provider === "ollama" ? ollamaBaseUrl.trim() : undefined,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error("Failed to save settings", { id: toastId, description: body.error });
        return;
      }

      setConfig(body);
      setApiKey("");
      toast.success("Settings saved", { id: toastId, description: `Active provider: ${body.provider}` });
    } catch (err) {
      toast.error("Failed to save settings", {
        id: toastId,
        description: err instanceof Error ? err.message : "Unexpected error.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    const toastId = toast.loading("Testing connection…");
    try {
      const res = await fetch("/api/settings/test");
      const body = await res.json();
      if (body.ok) {
        toast.success("Connection successful", { id: toastId, description: `Connected via ${body.provider}.` });
      } else {
        toast.error("Connection failed", {
          id: toastId,
          description: body.error ?? "Check that the provider is running and your key is valid.",
        });
      }
    } catch {
      toast.error("Connection test failed", { id: toastId, description: "Unexpected error." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Choose which AI backend Monome uses for embeddings, notes, and search. Stored at{" "}
        <code className="rounded bg-muted px-1 text-xs">~/.monome/config.json</code> — API keys are never sent
        anywhere except directly to the chosen provider.
      </p>

      {config && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="text-sm">
            <span>Currently active: </span>
            <span className="font-medium">{config.provider}</span>
            {config.provider === "ollama" && (
              <span className="text-muted-foreground">
                {" "}· chat: {config.ollamaChatModel} · embed: {config.ollamaEmbedModel}
              </span>
            )}
            {config.provider !== "ollama" && (
              <span className="text-muted-foreground">
                {config.hasApiKey ? " · key saved" : " · no key saved"}
              </span>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={handleTestConnection} disabled={testing}>
            {testing ? "Testing…" : "Test"}
          </Button>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
        {/* ── Provider selection ────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="radio"
              name="provider"
              value="ollama"
              checked={provider === "ollama"}
              onChange={() => setProvider("ollama")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Local (Ollama)</span>{" "}
              <span className="text-sm text-muted-foreground">— free, no data leaves your machine.</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="radio"
              name="provider"
              value="openai"
              checked={provider === "openai"}
              onChange={() => setProvider("openai")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">BYOK (OpenAI)</span>{" "}
              <span className="text-sm text-muted-foreground">— uses your own API key.</span>
              <br />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                ⚠ Your conversation text is sent to OpenAI&apos;s servers in this mode.
              </span>
            </span>
          </label>
        </div>

        {/* ── Ollama model config (only when Ollama selected) ───────── */}
        {provider === "ollama" && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ollama models</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fetchOllamaModels}
                disabled={fetchingModels}
              >
                {fetchingModels ? "Fetching…" : "Fetch installed models"}
              </Button>
            </div>

            {availableModels.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Click a model name to use it, or type one manually below.
              </p>
            )}

            {/* Chat model */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Chat model</label>
              <Input
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                placeholder="llama3.1:8b"
              />
              {availableModels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChatModel(m)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        chatModel === m
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Embed model */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Embedding model</label>
              <Input
                value={embedModel}
                onChange={(e) => setEmbedModel(e.target.value)}
                placeholder="nomic-embed-text"
              />
              {availableModels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEmbedModel(m)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        embedModel === m
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Base URL override */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Ollama base URL{" "}
                <span className="font-normal text-muted-foreground/60">(leave blank for localhost:11434)</span>
              </label>
              <Input
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>
          </div>
        )}

        {/* ── OpenAI API key ────────────────────────────────────────── */}
        {provider === "openai" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">API key</label>
            <Input
              type="password"
              placeholder={
                config?.hasApiKey && config.provider === "openai"
                  ? "Enter a new key to replace the saved one"
                  : "sk-..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </main>
  );
}
