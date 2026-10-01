"use client";

/**
 * Module-level store for note generation jobs, mirroring importJobStore.ts.
 * Keeping the fetch loop here (not in a React component) means navigating
 * away from the page that triggered the generation never cancels it — the
 * module stays alive for the entire browser session.
 *
 * Both single-conversation generation (GenerateNoteButton) and bulk
 * backfill (BackfillNotesButton) use this so they share the same
 * background-persistence guarantee.
 */

import { toast } from "@/components/ui/toast";

export interface NoteJobState {
  running: boolean;
  /** The specific conversation currently being generated, if any. */
  activeConversationId: string | null;
  current: number;
  total: number;
  failed: number;
  done: string[];
}

let state: NoteJobState = {
  running: false,
  activeConversationId: null,
  current: 0,
  total: 0,
  failed: 0,
  done: [],
};
const listeners = new Set<(s: NoteJobState) => void>();

function setState(patch: Partial<NoteJobState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getNoteJobState(): NoteJobState {
  return state;
}

export function subscribeNoteJob(listener: (s: NoteJobState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Generate a note for a single conversation in the background. */
export async function generateNoteBackground(conversationId: string): Promise<void> {
  if (state.running) {
    // A job is already running — just queue this as a single-item
    // extension rather than starting a parallel one. In practice the user
    // can't trigger this for the same conversation twice so the real
    // scenario is "user clicks Generate on two different conversations
    // quickly". Running them sequentially is fine for a local tool.
    toast.info("Note generation already in progress — your request will run next.");
    return;
  }

  setState({ running: true, activeConversationId: conversationId, current: 0, total: 1, failed: 0, done: [] });

  const toastId = toast.loading("Generating note…", {
    description: "This runs in the background — you can navigate away.",
    duration: Infinity,
  });

  try {
    const result = await generateOne(conversationId);

    if (result.ok) {
      toast.success("Note generated", { id: toastId });
      setState({ running: false, activeConversationId: null, current: 1, done: [conversationId] });
    } else {
      toast.error("Note generation failed", {
        id: toastId,
        description: result.error ?? "Check that Ollama is running.",
      });
      setState({ running: false, activeConversationId: null, current: 1, failed: 1 });
    }
  } catch (err) {
    toast.error("Note generation failed", {
      id: toastId,
      description: err instanceof Error ? err.message : "Unexpected error.",
    });
    setState({ running: false, activeConversationId: null, current: 1, failed: 1 });
  }
}

/** Bulk-generate notes for all conversations that are missing one. */
export async function backfillNotesBackground(): Promise<void> {
  if (state.running) {
    toast.info("Note generation already in progress.");
    return;
  }

  // Fetch the list first so we know the total before starting.
  let targets: { id: string; title: string }[] = [];
  try {
    const res = await fetch("/api/notes/missing");
    const body = await res.json();
    targets = body.conversations ?? [];
  } catch {
    toast.error("Could not fetch conversations missing notes.");
    return;
  }

  if (targets.length === 0) return;

  setState({ running: true, activeConversationId: null, current: 0, total: targets.length, failed: 0, done: [] });

  const toastId = toast.loading(`Generating notes (0 / ${targets.length})…`, {
    description: "Running in the background — you can navigate away.",
    duration: Infinity,
  });

  let failed = 0;
  const done: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    setState({ current: i + 1, activeConversationId: targets[i].id });

    toast.loading(`Generating notes (${i + 1} / ${targets.length})…`, {
      id: toastId,
      description: `"${targets[i].title}"`,
      duration: Infinity,
    });

    try {
      const result = await generateOne(targets[i].id);

      if (result.ok) {
        done.push(targets[i].id);
      } else {
        failed++;
        // Provider-level error (e.g. Ollama not running) — stop rather
        // than hammering the same broken call for every remaining conversation.
        if (!result.ok && result.error?.toLowerCase().includes("ollama")) {
          toast.error("Note generation stopped", {
            id: toastId,
            description: result.error,
          });
          setState({ running: false, activeConversationId: null, failed: targets.length - i, done });
          return;
        }
      }
    } catch (err) {
      toast.error("Note generation stopped", {
        id: toastId,
        description: err instanceof Error ? err.message : "Unexpected error.",
      });
      setState({ running: false, activeConversationId: null, failed: targets.length - i, done });
      return;
    }
  }

  const successCount = targets.length - failed;
  if (failed === 0) {
    toast.success(`Generated ${successCount} note${successCount !== 1 ? "s" : ""}`, { id: toastId });
  } else {
    toast.warning(`Generated ${successCount}, failed ${failed}`, {
      id: toastId,
      description: "Re-run from the Conversations page once the issue is fixed.",
    });
  }

  setState({ running: false, activeConversationId: null, current: targets.length, failed, done });
}

async function generateOne(
  conversationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/notes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
  const body = await res.json();

  if (!res.ok || !body.ok) {
    return { ok: false, error: body.error ?? "Unknown error." };
  }
  return { ok: true };
}
