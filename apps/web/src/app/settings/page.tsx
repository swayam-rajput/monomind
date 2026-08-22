"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderChoice = "ollama" | "openai";

interface ClientConfig {
  provider: string;
  hasApiKey: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [provider, setProvider] = useState<ProviderChoice>("ollama");
  const [apiKey, setApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((c: ClientConfig) => {
        setConfig(c);
        if (c.provider === "ollama" || c.provider === "openai") {
          setProvider(c.provider);
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError(null);
    setTestStatus("idle");

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey: provider === "openai" ? apiKey : undefined }),
    });
    const body = await res.json();

    if (!res.ok) {
      setSaveError(body.error ?? "Failed to save settings.");
      setSaveStatus("error");
      return;
    }

    setConfig(body);
    setApiKey("");
    setSaveStatus("saved");
  }

  async function handleTestConnection() {
    setTestStatus("testing");
    setTestMessage(null);

    const res = await fetch("/api/settings/test");
    const body = await res.json();

    if (body.ok) {
      setTestStatus("ok");
      setTestMessage(`Connected successfully via ${body.provider}.`);
    } else {
      setTestStatus("error");
      setTestMessage(body.error ?? "Connection test failed.");
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Choose which AI backend Monome uses for embeddings, notes, and search. This choice lives in a local file
        (~/.monome/config.json) on your machine, not in the app database, and API keys are never sent anywhere except
        directly to the provider you choose.
      </p>

      {config && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <p className="text-sm">
            Currently active: <span className="font-medium">{config.provider}</span>
            {config.provider !== "ollama" && (config.hasApiKey ? " (key saved)" : " (no key saved)")}
          </p>
          <Button variant="secondary" size="sm" onClick={handleTestConnection} disabled={testStatus === "testing"}>
            {testStatus === "testing" ? "Testing..." : "Test connection"}
          </Button>
        </div>
      )}

      {testMessage && (
        <p className={`text-sm ${testStatus === "ok" ? "text-green-600" : "text-destructive"}`}>{testMessage}</p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="provider"
            value="ollama"
            checked={provider === "ollama"}
            onChange={() => setProvider("ollama")}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Local (Ollama)</span> — free, runs entirely on this machine. Requires
            Ollama running at localhost:11434 with <code className="rounded bg-muted px-1">nomic-embed-text</code>{" "}
            (embeddings) and <code className="rounded bg-muted px-1">llama3.1:8b</code> (chat) pulled.
          </span>
        </label>

        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="provider"
            value="openai"
            checked={provider === "openai"}
            onChange={() => setProvider("openai")}
            className="mt-1"
          />
          <span>
            <span className="font-medium">BYOK (OpenAI)</span> — uses your own API key. Calls go directly from this
            app to OpenAI, never through any third-party server.
          </span>
        </label>

        {provider === "openai" && (
          <Input
            type="password"
            placeholder={config?.hasApiKey && config.provider === "openai" ? "Enter a new key to replace the saved one" : "sk-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        )}

        <Button type="submit" disabled={saveStatus === "saving"} className="w-fit">
          {saveStatus === "saving" ? "Validating & saving..." : "Save"}
        </Button>

        {saveStatus === "saved" && <p className="text-sm text-green-600">Saved.</p>}
        {saveStatus === "error" && saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </form>
    </main>
  );
}
