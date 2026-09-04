"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChatSelectionDialog } from "@/components/ChatSelectionDialog";
import {
  getImportJobState,
  subscribeImportJob,
  runImportJob,
  isImportJobRunning,
  type ImportJobState,
} from "@/lib/importJobStore";
import type { ParsedConversation, ImportPreviewResponse, ImportSummary } from "@monome/types";

export default function ImportPage() {
  // Subscribes to the module-level job store (see importJobStore.ts)
  // instead of owning this state locally - the import/embed/notes
  // pipeline keeps running via that store even if this page unmounts
  // (e.g. the user switches tabs), and re-mounting here just resumes
  // showing whatever progress the store already has.
  const [job, setJob] = useState<ImportJobState>(getImportJobState());
  const [pastedText, setPastedText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [parsedConversations, setParsedConversations] = useState<ParsedConversation[]>([]);
  const [skippedConversations, setSkippedConversations] = useState<{ identifier: string; reason: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeImportJob(setJob), []);

  // const running = isImportJobRunning();

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a .zip file first.");
      return;
    }

    setIsProcessingFile(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import", { method: "POST", body: formData });
      const result: ImportPreviewResponse | ImportSummary = await response.json();

      if (!response.ok) {
        toast.error("Import failed", { description: (result as any).error });
        return;
      }

      if ("type" in result && result.type === "preview") {
        // Show dialog with conversations to select
        setParsedConversations(result.conversations);
        setSkippedConversations(result.skipped || []);
        setShowDialog(true);
      } else {
        // Direct import (shouldn't happen with new flow, but keeping for safety)
        toast.success("Import completed");
      }
    } catch (err) {
      toast.error("Import failed", { 
        description: err instanceof Error ? err.message : "Unknown error" 
      });
    } finally {
      setIsProcessingFile(false);
    }
  }

  async function handleSelectedImport(selectedConversations: ParsedConversation[]) {
    setIsImporting(true);
    
    await runImportJob(() =>
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          selectedConversations, 
          skipped: skippedConversations 
        }),
      })
    );

    setIsImporting(false);
    setShowDialog(false);
    setParsedConversations([]);
    setSkippedConversations([]);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDialogClose() {
    setShowDialog(false);
    setParsedConversations([]);
    setSkippedConversations([]);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
  const running = isImportJobRunning();
  const isAnyProcessRunning = running || isProcessingFile;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl font-bold">Import conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything runs locally on your machine. Once started, all three phases (import → embed → notes) keep
          running in the background even if you navigate to another page.
        </p>
      </div>

      <ChatSelectionDialog
        conversations={parsedConversations}
        isOpen={showDialog}
        onClose={handleDialogClose}
        onImport={handleSelectedImport}
        isImporting={isImporting}
      />

      {/* ── Phase step indicator (shown while running or done) ─────── */}
      {phase !== "idle" && phase !== "error" && (
        <div className="flex items-center gap-2 text-xs">
          {(
            [
              { key: "importing", label: "Import" },
              { key: "embedding", label: "Embed" },
              { key: "generating-notes", label: "Notes" },
              { key: "done", label: "Done" },
            ] as { key: typeof phase; label: string }[]
          ).map((step, i, arr) => {
            const phaseOrder: Record<string, number> = { importing: 0, embedding: 1, "generating-notes": 2, done: 3 };
            const current = phaseOrder[phase] ?? 0;
            const stepIdx = phaseOrder[step.key] ?? 0;
            const isDone = stepIdx < current;
            const isActive = stepIdx === current;
            return (
              <span key={step.key} className="flex items-center gap-2">
                <span
                  className={
                    isDone
                      ? "font-medium text-foreground"
                      : isActive
                        ? "shimmer text font-medium text-primary"
                        : "text-muted-foreground"
                  }
                >
                  {isDone ? "✓" : `${stepIdx + 1}.`} {step.label}
                </span>
                {i < arr.length - 1 && <span className="text-muted-foreground/40">›</span>}
              </span>
            );
          })}
        </div>
      )}

      <form onSubmit={handleFileSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium">ChatGPT export (.zip)</h2>
        <p className="text-sm text-muted-foreground">
          Upload the .zip file you get from ChatGPT Settings &rarr; Data controls &rarr; Export data. We look for
          conversations.json inside it.
        </p>
        
        {isProcessingFile && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>Processing ChatGPT export file...</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Parsing conversations from the export. This may take a moment for large files.
            </p>
          </div>
        )}
        
        <Input ref={fileInputRef} type="file" accept=".zip" disabled={isProcessingFile} />
        <Button type="submit" disabled={isAnyProcessRunning} className="w-fit">
          {isProcessingFile ? "Processing export..." : phase === "importing" ? "Importing..." : "Import export"}
        </Button>
      </form>

      {/* <form onSubmit={handlePasteSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
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
        <Button type="submit" disabled={isAnyProcessRunning} className="w-fit">
          {phase === "importing" ? "Importing..." : "Import pasted conversation"}
        </Button>
      </form> */}

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
            Imported {summary.importedCount} conversation{summary.importedCount === 1 ? "" : "s"}
            {summary.duplicateCount && summary.duplicateCount > 0 ? (
              <span className="ml-1 text-muted-foreground">
                · {summary.duplicateCount} already existed and {summary.duplicateCount === 1 ? "was" : "were"} skipped
              </span>
            ) : null}
            {summary.skippedCount - (summary.duplicateCount ?? 0) > 0 ? (
              <span className="ml-1 text-muted-foreground">
                · {summary.skippedCount - (summary.duplicateCount ?? 0)} malformed and skipped
              </span>
            ) : null}
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
            <Link href="/conversations" className="mt-4 inline-block text-sm font-medium text-link underline">
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
