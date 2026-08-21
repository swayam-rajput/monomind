"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ImportSummary } from "@monome/types";

type Status = "idle" | "loading" | "embedding" | "generating-notes" | "done" | "error";

interface EmbedProgress {
  current: number;
  total: number;
  failedChunks: number;
  providerErrors: string[];
}

interface NotesProgress {
  current: number;
  total: number;
  failedNotes: number;
  providerErrors: string[];
}

export default function ImportPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [embedProgress, setEmbedProgress] = useState<EmbedProgress | null>(null);
  const [notesProgress, setNotesProgress] = useState<NotesProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runImport(request: () => Promise<Response>) {
    setStatus("loading");
    setError(null);
    setSummary(null);
    setEmbedProgress(null);
    setNotesProgress(null);

    try {
      const res = await request();
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Import failed.");
        setStatus("error");
        return;
      }

      const importSummary = body as ImportSummary;
      setSummary(importSummary);

      if (importSummary.importedConversationIds.length > 0) {
        await runEmbedding(importSummary.importedConversationIds);
        await runNoteGeneration(importSummary.importedConversationIds);
      }

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setStatus("error");
    }
  }

  async function runEmbedding(conversationIds: string[]) {
    setStatus("embedding");
    const providerErrors: string[] = [];
    let failedChunks = 0;

    for (let i = 0; i < conversationIds.length; i++) {
      setEmbedProgress({ current: i + 1, total: conversationIds.length, failedChunks, providerErrors });

      try {
        const res = await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationIds[i] }),
        });
        const body = await res.json();

        if (!res.ok) {
          // A conversation-level failure (e.g. Ollama isn't running) - stop
          // the loop early rather than retrying the same broken call for
          // every remaining conversation.
          providerErrors.push(body.error ?? "Embedding failed.");
          break;
        }

        failedChunks += body.failedCount ?? 0;
      } catch (err) {
        providerErrors.push(err instanceof Error ? err.message : "Embedding failed.");
        break;
      }
    }

    setEmbedProgress({ current: conversationIds.length, total: conversationIds.length, failedChunks, providerErrors });
  }

  async function runNoteGeneration(conversationIds: string[]) {
    setStatus("generating-notes");
    const providerErrors: string[] = [];
    let failedNotes = 0;

    for (let i = 0; i < conversationIds.length; i++) {
      setNotesProgress({ current: i + 1, total: conversationIds.length, failedNotes, providerErrors });

      try {
        const res = await fetch("/api/notes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationIds[i] }),
        });
        const body = await res.json();

        if (!res.ok) {
          // Conversation-level failure (e.g. provider unreachable) - stop
          // rather than repeating the same broken call for every remaining
          // conversation.
          providerErrors.push(body.error ?? "Note generation failed.");
          break;
        }

        if (!body.ok) {
          // Per-conversation failure (bad JSON after retry, etc) - log and
          // keep going, same pattern as per-chunk embedding failures.
          failedNotes++;
        }
      } catch (err) {
        providerErrors.push(err instanceof Error ? err.message : "Note generation failed.");
        break;
      }
    }

    setNotesProgress({ current: conversationIds.length, total: conversationIds.length, failedNotes, providerErrors });
  }

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .zip file first.");
      setStatus("error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    await runImport(() => fetch("/api/import", { method: "POST", body: formData }));
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedText.trim()) {
      setError("Paste some conversation JSON first.");
      setStatus("error");
      return;
    }

    await runImport(() =>
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText }),
      })
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Import conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below runs locally and writes straight to your SQLite database. No AI calls happen during
          import.
        </p>
      </div>

      <form onSubmit={handleFileSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="font-medium">ChatGPT export (.zip)</h2>
        <p className="text-sm text-muted-foreground">
          Upload the .zip file you get from ChatGPT Settings &rarr; Data controls &rarr; Export data. We look for
          conversations.json inside it.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="rounded border border-border bg-background p-2 text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "embedding" || status === "generating-notes"}
          className="w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === "loading" ? "Importing..." : "Import export"}
        </button>
      </form>

      <form onSubmit={handlePasteSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="font-medium">Paste a single conversation (for quick testing)</h2>
        <p className="text-sm text-muted-foreground">
          Paste either{" "}
          <code className="rounded bg-muted px-1 py-0.5">{'{ "title", "messages": [{ "role", "content" }] }'}</code>{" "}
          or a raw conversation object copied from conversations.json.
        </p>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={10}
          placeholder='{"title": "Test chat", "messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there"}]}'
          className="rounded border border-border bg-background p-2 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "embedding" || status === "generating-notes"}
          className="w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === "loading" ? "Importing..." : "Import pasted conversation"}
        </button>
      </form>

      {status === "embedding" && embedProgress && (
        <div className="rounded-lg border border-border p-5">
          <p className="text-sm font-medium">
            Embedding conversation {embedProgress.current} of {embedProgress.total}...
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(embedProgress.current / embedProgress.total) * 100}%` }}
            />
          </div>
          {embedProgress.failedChunks > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {embedProgress.failedChunks} chunk{embedProgress.failedChunks === 1 ? "" : "s"} failed to embed so far
              (will be retryable later).
            </p>
          )}
        </div>
      )}

      {status === "generating-notes" && notesProgress && (
        <div className="rounded-lg border border-border p-5">
          <p className="text-sm font-medium">
            Generating notes for conversation {notesProgress.current} of {notesProgress.total}...
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(notesProgress.current / notesProgress.total) * 100}%` }}
            />
          </div>
          {notesProgress.failedNotes > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {notesProgress.failedNotes} note{notesProgress.failedNotes === 1 ? "" : "s"} failed to generate so far.
            </p>
          )}
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "done" && summary && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-medium">
            Imported {summary.importedCount} conversation{summary.importedCount === 1 ? "" : "s"}, skipped{" "}
            {summary.skippedCount} malformed
          </h2>

          {summary.warnings.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
              {summary.warnings.map((w, i) => (
                <li key={i}>
                  <span className="font-medium">{w.identifier}:</span> {w.reason}
                </li>
              ))}
            </ul>
          )}

          {embedProgress && (
            <p className="mt-3 text-sm">
              Embedded {embedProgress.current} of {embedProgress.total} conversation
              {embedProgress.total === 1 ? "" : "s"}.
              {embedProgress.failedChunks > 0 &&
                ` ${embedProgress.failedChunks} chunk${embedProgress.failedChunks === 1 ? "" : "s"} failed and can be retried from the conversation detail page.`}
              {embedProgress.providerErrors.length > 0 && (
                <span className="mt-1 block text-destructive">{embedProgress.providerErrors[0]}</span>
              )}
            </p>
          )}

          {notesProgress && (
            <p className="mt-3 text-sm">
              Generated notes for {notesProgress.total - notesProgress.failedNotes} of {notesProgress.total}{" "}
              conversation{notesProgress.total === 1 ? "" : "s"}.
              {notesProgress.failedNotes > 0 &&
                ` ${notesProgress.failedNotes} note${notesProgress.failedNotes === 1 ? "" : "s"} could not be generated (check server logs for details).`}
              {notesProgress.providerErrors.length > 0 && (
                <span className="mt-1 block text-destructive">{notesProgress.providerErrors[0]}</span>
              )}
            </p>
          )}

          {summary.importedCount > 0 && (
            <Link href="/conversations" className="mt-4 inline-block text-sm font-medium underline">
              View imported conversations &rarr;
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
