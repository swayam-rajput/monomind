"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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
      .then((response) => response.json())
      .then((data: ClientConfig) => {
        setConfig(data);

        if (data.provider === "ollama" || data.provider === "openai") {
          setProvider(data.provider);
        }

        setChatModel(data.ollamaChatModel ?? "llama3.1:8b");
        setEmbedModel(data.ollamaEmbedModel ?? "nomic-embed-text");
        setOllamaBaseUrl(data.ollamaBaseUrl ?? "");
      })
      .catch(() => {
        toast.error("Failed to load settings.");
      });
  }, []);

  async function fetchOllamaModels() {
    setFetchingModels(true);

    const toastId = toast.loading("Fetching models from Ollama…");

    try {
      const response = await fetch("/api/ollama/models");
      const body = await response.json();

      if (!response.ok) {
        toast.error("Could not fetch models", {
          id: toastId,
          description: body.error,
        });
        return;
      }

      setAvailableModels(body.models as string[]);

      toast.success(
        `Found ${body.models.length} model${
          body.models.length === 1 ? "" : "s"
        }`,
        { id: toastId },
      );
    } catch {
      toast.error("Could not reach Ollama", { id: toastId });
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const toastId = toast.loading("Saving settings…");

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          apiKey: provider === "openai" ? apiKey : undefined,
          ollamaChatModel:
            provider === "ollama" ? chatModel.trim() : undefined,
          ollamaEmbedModel:
            provider === "ollama" ? embedModel.trim() : undefined,
          ollamaBaseUrl:
            provider === "ollama" ? ollamaBaseUrl.trim() : undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        toast.error("Failed to save settings", {
          id: toastId,
          description: body.error,
        });
        return;
      }

      setConfig(body);
      setApiKey("");

      toast.success("Settings saved", {
        id: toastId,
      });
    } catch (error) {
      toast.error("Failed to save settings", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);

    const toastId = toast.loading("Testing connection…");

    try {
      const response = await fetch("/api/settings/test");
      const body = await response.json();

      if (body.ok) {
        toast.success("Connection successful", {
          id: toastId,
          description: `Connected via ${body.provider}.`,
        });
      } else {
        toast.error("Connection failed", {
          id: toastId,
          description:
            body.error ??
            "Check that the provider is running and your key is valid.",
        });
      }
    } catch {
      toast.error("Connection test failed", {
        id: toastId,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-8">
      <div className="space-y-7">
        {/* Header */}
        <header className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Configure the AI backend Monome uses for embeddings, notes, and
              search.
            </p>
          </div>

          {config && (
            <div className="hidden text-right sm:block">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Active
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {config.provider === "ollama" ? "Local · Ollama" : "BYOK · OpenAI"}
              </p>
            </div>
          )}
        </header>

        <form onSubmit={handleSave}>
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main settings */}
            <div className="space-y-7">
              {/* Provider */}
              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-medium">AI provider</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Choose where Monome runs its language models.
                  </p>
                </div>

<div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">
  <Button
    type="button"
    variant="ghost"
    onClick={() => setProvider("ollama")}
    className={cn(
      "h-auto justify-start rounded-md px-3 py-2 text-left transition-all",
      provider === "ollama"
        ? "bg-background border border-border text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
    )}
  >
    <span className="flex flex-row items-center gap-4">
      <span className="text-sm font-medium">Ollama</span>
      <span className="text-xs font-normal text-muted-foreground">Local</span>
    </span>
  </Button>

  <Button
    type="button"
    variant="ghost"
    onClick={() => setProvider("openai")}
    className={cn(
      "h-auto justify-start rounded-md px-3 py-2 text-left transition-all",
      provider === "openai"
        ? "bg-background border border-border text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
    )}
  >
    <span className="flex flex-row items-center gap-4">
      <span className="text-sm font-medium">OpenAI</span>
      <span className="text-xs font-normal text-muted-foreground">BYOK</span>
    </span>
  </Button>
</div>


                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Privacy:</span>{" "}
                  API keys are stored locally and only sent to the provider you
                  choose.
                </div>
              </section>

              {/* Ollama */}
              {provider === "ollama" && (
                <section className="space-y-5 border-t border-border pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium">
                        Ollama configuration
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Configure the local models Monome uses.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchOllamaModels}
                      disabled={fetchingModels}
                    >
                      {fetchingModels ? "Fetching…" : "Fetch models"}
                    </Button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <ModelField
                      label="Chat model"
                      value={chatModel}
                      placeholder="llama3.1:8b"
                      models={availableModels}
                      onChange={setChatModel}
                    />

                    <ModelField
                      label="Embedding model"
                      value={embedModel}
                      placeholder="nomic-embed-text"
                      models={availableModels}
                      onChange={setEmbedModel}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="ollama-base-url"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Ollama base URL{" "}
                      <span className="font-normal text-muted-foreground/60">
                        optional
                      </span>
                    </label>

                    <Input
                      id="ollama-base-url"
                      value={ollamaBaseUrl}
                      onChange={(e) => setOllamaBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                </section>
              )}

              {/* OpenAI */}
              {provider === "openai" && (
                <section className="space-y-5 border-t border-border pt-6">
                  <div>
                    <h2 className="text-sm font-medium">
                      OpenAI configuration
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Use your own API key for model inference.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="api-key"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      API key
                    </label>

                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        config?.hasApiKey && config.provider === "openai"
                          ? "Enter a new key to replace the saved one"
                          : "sk-..."
                      }
                      autoComplete="off"
                    />

                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Conversation text is sent to OpenAI when this provider is
                      used.
                    </p>
                  </div>
                </section>
              )}
            </div>

            {/* Right side */}
            <aside className="space-y-5 lg:border-l lg:border-border lg:pl-7">
              <section>
                <p className="text-xs font-medium text-muted-foreground">
                  Current configuration
                </p>

                <div className="mt-2 rounded-lg border border-border p-4">
                  {config ? (
                    <>
                      <p className="text-sm font-medium">
                        {config.provider === "ollama"
                          ? "Local · Ollama"
                          : "BYOK · OpenAI"}
                      </p>

                      {config.provider === "ollama" ? (
                        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex justify-between gap-4">
                            <span>Chat</span>
                            <span className="text-right text-foreground">
                              {config.ollamaChatModel}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span>Embeddings</span>
                            <span className="text-right text-foreground">
                              {config.ollamaEmbedModel}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span>Base URL</span>
                            <span className="max-w-[150px] truncate text-right text-foreground">
                              {config.ollamaBaseUrl || "Default"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {config.hasApiKey
                            ? "API key configured"
                            : "No API key saved"}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Loading configuration…
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-lg bg-muted/40 p-4">
                <p className="text-xs font-medium">Before you save</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Make sure Ollama is running and the selected models are
                  installed. Changes apply to new AI operations.
                </p>
              </section>
            </aside>
          </div>

          {/* Actions */}
          <div className="mt-7 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Testing…" : "Test connection"}
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function ModelField({
  label,
  value,
  placeholder,
  models,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  models: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={label}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>

      <Input
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      {models.length > 0 && (
        <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
          {models.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => onChange(model)}
              className={cn(
                "max-w-full truncate rounded-md border px-2 py-1 text-xs transition-colors",
                value === model
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {model}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
