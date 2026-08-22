"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  getImportJobState,
  subscribeImportJob,
  runImportJob,
  isImportJobRunning,
  type ImportJobState,
} from "@/lib/importJobStore";

export default function ImportPage() {
  // Subscribes to the module-level job store (see importJobStore.ts)
  // instead of owning this state locally - the import/embed/notes
  // pipeline keeps running via that store even if this page unmounts
  // (e.g. the user switches tabs), and re-mounting here just resumes
  // showing whatever progress the store already has.
  const [job, setJob] = useState<ImportJobState>(getImportJobState());
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeImportJob(setJob), []);

  const running = isImportJobRunning();

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a .zip file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    await runImportJob(() => fetch("/api/import", { method: "POST", body: formData }));
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedText.trim()) {
      toast.error("Paste some conversation JSON first.");
      return;
    }

    await runImportJob(() =>
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText }),
      })
    );
  }

  const { phase, error, summary, embedProgress, notesProgress } = job;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl font-bold">Import conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below runs locally and writes straight to your SQLite database. Once started, importing,
          embedding, and note generation keep running in the background even if you navigate to another page.
        </p>
      </div>

      <form onSubmit={handleFileSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium">ChatGPT export (.zip)</h2>
        <p className="text-sm text-muted-foreground">
          Upload the .zip file you get from ChatGPT Settings &rarr; Data controls &rarr; Export data. We look for
          conversations.json inside it.
        </p>
        <Input ref={fileInputRef} type="file" accept=".zip" />
        <Button type="submit" disabled={running} className="w-fit">
          {phase === "importing" ? "Importing..." : "Import export"}
        </Button>
      </form>

      <form onSubmit={handlePasteSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium">Paste a single conversation (for quick testing)</h2>
        <p className="text-sm text-muted-foreground">
          Paste either{" "}
          <code className="rounded-md bg-muted px-1 py-0.5">{'{ "title", "messages": [{ "role", "content" }] }'}</code>{" "}
          or a raw conversation object copied from conversations.json.
        </p>
        <Textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={10}
          placeholder='{"title": "Test chat", "messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there"}]}'
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={running} className="w-fit">
          {phase === "importing" ? "Importing..." : "Import pasted conversation"}
        </Button>
      </form>

      {phase === "embedding" && embedProgress && (
        <div className="rounded-lg border border-border bg-card p-6">
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

      {phase === "generating-notes" && notesProgress && (
        <div className="rounded-lg border border-border bg-card p-6">
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

      {phase === "error" && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {phase === "done" && summary && (
        <div className="rounded-lg border border-border bg-card p-6">
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
            </p>
          )}

          {summary.importedCount > 0 && (
            <Link href="/conversations" className="mt-4 inline-block text-sm font-medium text-[#0000ee] underline">
              View imported conversations &rarr;
            </Link>
          )}
        </div>
      )}

      {phase === "done" && notesProgress && (notesProgress.failedNotes > 0 || notesProgress.providerErrors.length > 0) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">
            {notesProgress.failedNotes} note{notesProgress.failedNotes === 1 ? "" : "s"} could not be generated.
          </p>
          {notesProgress.providerErrors.length > 0 && <p className="mt-1">{notesProgress.providerErrors[0]}</p>}
          <p className="mt-2">
            You can retry from the{" "}
            <Link href="/conversations" className="underline">
              Conversations page
            </Link>{" "}
            once the issue above is resolved (e.g. start Ollama) - a "Generate missing notes" button will appear
            there.
          </p>
        </div>
      )}

      {phase === "done" && embedProgress && (embedProgress.failedChunks > 0 || embedProgress.providerErrors.length > 0) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">
            {embedProgress.failedChunks} chunk{embedProgress.failedChunks === 1 ? "" : "s"} failed to embed.
          </p>
          {embedProgress.providerErrors.length > 0 && <p className="mt-1">{embedProgress.providerErrors[0]}</p>}
          <p className="mt-2">
            Retryable from each conversation's detail page under{" "}
            <Link href="/conversations" className="underline">
              Conversations
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
