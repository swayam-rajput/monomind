"use client";

import { toast } from "sonner";

/**
 * Module-level (not React-state) store for the active import pipeline
 * (import -> embed -> notes). Module state survives client-side route
 * navigation because Next.js's App Router keeps the same JS runtime alive
 * across page transitions - only component state gets torn down when a
 * component unmounts. By keeping the job's state here instead of inside
 * the /import page component, switching tabs/routes no longer loses
 * progress or aborts the in-flight work.
 *
 * The /import page subscribes to this store while mounted; if the user
 * navigates away mid-job, the fetch loop below keeps running against this
 * module-level state, and a toast reports completion whenever it's done.
 */

export type ImportPhase = "idle" | "importing" | "embedding" | "generating-notes" | "done" | "error";

export interface ImportJobState {
  phase: ImportPhase;
  error: string | null;
  summary: {
    importedCount: number;
    skippedCount: number;
    duplicateCount?: number;
    warnings: { identifier: string; reason: string }[];
    importedConversationIds: string[];
  } | null;
  embedProgress: { current: number; total: number; failedChunks: number; providerErrors: string[] } | null;
  notesProgress: { current: number; total: number; failedNotes: number; providerErrors: string[] } | null;
}

const initialState: ImportJobState = {
  phase: "idle",
  error: null,
  summary: null,
  embedProgress: null,
  notesProgress: null,
};

let state: ImportJobState = { ...initialState };
const listeners = new Set<(s: ImportJobState) => void>();

function setState(patch: Partial<ImportJobState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getImportJobState(): ImportJobState {
  return state;
}

export function subscribeImportJob(listener: (s: ImportJobState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while a job is actively running - used to disable "start new import" controls. */
export function isImportJobRunning(): boolean {
  return state.phase === "importing" || state.phase === "embedding" || state.phase === "generating-notes";
}

export async function runImportJob(request: () => Promise<Response>): Promise<void> {
  setState({ ...initialState, phase: "importing" });

  try {
    const res = await request();
    const body = await res.json();

    if (!res.ok) {
      setState({ phase: "error", error: body.error ?? "Import failed." });
      toast.error("Import failed", { description: body.error ?? "Import failed." });
      return;
    }

    setState({ summary: body });

    if (body.importedConversationIds.length > 0) {
      await runEmbeddingPhase(body.importedConversationIds);
      await runNotesPhase(body.importedConversationIds);
    }

    setState({ phase: "done" });
    const dupMsg = body.duplicateCount && body.duplicateCount > 0
      ? ` · ${body.duplicateCount} duplicate${body.duplicateCount === 1 ? "" : "s"} skipped`
      : "";
    toast.success(`Imported ${body.importedCount} conversation${body.importedCount === 1 ? "" : "s"}${dupMsg}`, {
      description: "Embedding and note generation finished.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    setState({ phase: "error", error: message });
    toast.error("Import failed", { description: message });
  }
}

async function runEmbeddingPhase(conversationIds: string[]): Promise<void> {
  setState({ phase: "embedding" });
  const providerErrors: string[] = [];
  let failedChunks = 0;

  for (let i = 0; i < conversationIds.length; i++) {
    setState({ embedProgress: { current: i + 1, total: conversationIds.length, failedChunks, providerErrors } });

    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationIds[i] }),
      });
      const body = await res.json();

      if (!res.ok) {
        providerErrors.push(body.error ?? "Embedding failed.");
        break;
      }
      failedChunks += body.failedCount ?? 0;
    } catch (err) {
      providerErrors.push(err instanceof Error ? err.message : "Embedding failed.");
      break;
    }
  }

  setState({
    embedProgress: { current: conversationIds.length, total: conversationIds.length, failedChunks, providerErrors },
  });

  if (failedChunks > 0 || providerErrors.length > 0) {
    toast.warning("Some chunks failed to embed", {
      description: providerErrors[0] ?? `${failedChunks} chunk(s) failed. Retry from the conversation detail page.`,
    });
  }
}

async function runNotesPhase(conversationIds: string[]): Promise<void> {
  setState({ phase: "generating-notes" });
  const providerErrors: string[] = [];
  let failedNotes = 0;

  for (let i = 0; i < conversationIds.length; i++) {
    setState({ notesProgress: { current: i + 1, total: conversationIds.length, failedNotes, providerErrors } });

    try {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationIds[i] }),
      });
      const body = await res.json();

      if (!res.ok) {
        providerErrors.push(body.error ?? "Note generation failed.");
        break;
      }
      if (!body.ok) failedNotes++;
    } catch (err) {
      providerErrors.push(err instanceof Error ? err.message : "Note generation failed.");
      break;
    }
  }

  setState({
    notesProgress: { current: conversationIds.length, total: conversationIds.length, failedNotes, providerErrors },
  });

  if (failedNotes > 0 || providerErrors.length > 0) {
    toast.warning("Some notes failed to generate", {
      description:
        providerErrors[0] ?? `${failedNotes} note(s) failed. Use "Generate missing notes" on Conversations.`,
    });
  }
}
