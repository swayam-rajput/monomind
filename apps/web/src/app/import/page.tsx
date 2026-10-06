"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ChatSelectionDialog } from "@/components/ChatSelectionDialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  getImportJobState,
  isImportJobRunning,
  runImportJob,
  subscribeImportJob,
  type ImportJobState,
} from "@/lib/importJobStore";
import type {
  ImportPreviewResponse,
  ImportSummary,
  ParsedConversation,
} from "@monome/types";

export default function ImportPage() {
  const [job, setJob] = useState<ImportJobState>(getImportJobState());
  const [showDialog, setShowDialog] = useState(false);
  const [conversations, setConversations] = useState<ParsedConversation[]>([]);
  const [skipped, setSkipped] = useState<
    { identifier: string; reason: string }[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeImportJob(setJob), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error("Choose a .zip file first.");
      return;
    }

    setProcessing(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
      });

      const result: ImportPreviewResponse | ImportSummary =
        await response.json();

      if (!response.ok) {
        toast.error("Import failed", {
          description: (result as any).error,
        });
        return;
      }

      if ("type" in result && result.type === "preview") {
        setConversations(result.conversations);
        setSkipped(result.skipped ?? []);
        setShowDialog(true);
      }
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleImport(selected: ParsedConversation[]) {
    setImporting(true);

    await runImportJob(() =>
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedConversations: selected,
          skipped,
        }),
      }),
    );

    setImporting(false);
    closeDialog();
  }

  function closeDialog() {
    setShowDialog(false);
    setConversations([]);
    setSkipped([]);

    if (fileRef.current) fileRef.current.value = "";
  }

  const { phase, error, summary, embedProgress, notesProgress } = job;
  const busy = processing || isImportJobRunning();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import your AI conversations into Monome.
          </p>
        </header>

        <ChatSelectionDialog
          conversations={conversations}
          isOpen={showDialog}
          onClose={closeDialog}
          onImport={handleImport}
          isImporting={importing}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            {/* Upload */}
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-border bg-card"
            >
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  ↑
                </div>

                <h2 className="mt-4 text-sm font-medium">
                  ChatGPT export
                </h2>

                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Select the .zip file from ChatGPT. Monome will find
                  conversations.json automatically.
                </p>

                <div className="mt-5 flex w-full max-w-sm gap-2">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".zip"
                    disabled={busy}
                  />

                  <Button type="submit" disabled={busy}>
                    {processing ? "Processing…" : "Import"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Progress */}
            {phase === "embedding" && embedProgress && (
              <Progress
                label="Embedding"
                current={embedProgress.current}
                total={embedProgress.total}
                error={
                  embedProgress.failedChunks
                    ? `${embedProgress.failedChunks} chunks failed.`
                    : undefined
                }
              />
            )}

            {phase === "generating-notes" && notesProgress && (
              <Progress
                label="Generating notes"
                current={notesProgress.current}
                total={notesProgress.total}
                error={
                  notesProgress.failedNotes
                    ? `${notesProgress.failedNotes} notes failed.`
                    : undefined
                }
              />
            )}

            {/* Error */}
            {phase === "error" && error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Complete */}
            {phase === "done" && summary && (
              <Result
                summary={summary}
                embedProgress={embedProgress}
                notesProgress={notesProgress}
              />
            )}
          </div>

          {/* Status */}
          <aside className="lg:border-l lg:pl-6">
            <p className="text-xs font-medium text-muted-foreground">
              Status
            </p>

            <div className="mt-3 space-y-3">
              {["Import", "Embed", "Notes"].map((label, i) => {
                const active =
                  (i === 0 && phase === "importing") ||
                  (i === 1 && phase === "embedding") ||
                  (i === 2 && phase === "generating-notes");

                const done =
                  (i === 0 &&
                    ["embedding", "generating-notes", "done"].includes(
                      phase,
                    )) ||
                  (i === 1 &&
                    ["generating-notes", "done"].includes(phase)) ||
                  (i === 2 && phase === "done");

                return (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className={`flex size-6 items-center justify-center rounded-full text-[11px] ${
                        done
                          ? "bg-foreground text-background"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </div>

                    <span
                      className={
                        active
                          ? "text-sm font-medium"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              Import, embedding, and note generation continue in the
              background if you leave this page.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Progress({
  label,
  current,
  total,
  error,
}: {
  label: string;
  current: number;
  total: number;
  error?: string;
}) {
  const percent = total ? (current / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current}/{total}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
      )}
    </div>
  );
}

function Result({
  summary,
  embedProgress,
  notesProgress,
}: {
  summary: ImportSummary;
  embedProgress: ImportJobState["embedProgress"];
  notesProgress: ImportJobState["notesProgress"];
}) {
  const duplicates = summary.duplicateCount ?? 0;
  const malformed = summary.skippedCount - duplicates;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Import complete</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your conversations are ready.
          </p>
        </div>

        <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
          ✓
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Imported" value={summary.importedCount} />

        <Stat
          label="Embedded"
          value={
            embedProgress
              ? `${embedProgress.current}/${embedProgress.total}`
              : "—"
          }
        />

        <Stat
          label="Notes"
          value={
            notesProgress
              ? notesProgress.total - notesProgress.failedNotes
              : "—"
          }
        />
      </div>

      {(duplicates > 0 || malformed > 0) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {duplicates > 0 &&
            `${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped. `}
          {malformed > 0 &&
            `${malformed} malformed conversation${
              malformed === 1 ? "" : "s"
            } skipped.`}
        </p>
      )}

      {summary.warnings.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.warnings[0].identifier}: {summary.warnings[0].reason}
        </p>
      )}

      {summary.importedCount > 0 && (
        <Link
          href="/conversations"
          className="mt-4 inline-block text-sm font-medium text-link underline underline-offset-2"
        >
          View conversations →
        </Link>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}