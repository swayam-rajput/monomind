"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Progress {
  current: number;
  total: number;
  failed: number;
  lastError: string | null;
}

/**
 * Finds conversations with zero notes and generates one for each, one at
 * a time, with visible progress - the retroactive fix for bug #5 (notes
 * silently failing to generate, e.g. because Ollama wasn't running at
 * import time, with no way to retry short of re-importing).
 */
export function BackfillNotesButton() {
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notes/missing")
      .then((r) => r.json())
      .then((body: { conversations: { id: string; title: string }[] }) => setMissingCount(body.conversations.length))
      .catch(() => setMissingCount(0));
  }, []);

  async function handleBackfill() {
    setStatus("running");

    const res = await fetch("/api/notes/missing");
    const body: { conversations: { id: string; title: string }[] } = await res.json();
    const targets = body.conversations;

    let failed = 0;
    let lastError: string | null = null;

    for (let i = 0; i < targets.length; i++) {
      setProgress({ current: i + 1, total: targets.length, failed, lastError });

      try {
        const genRes = await fetch("/api/notes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: targets[i].id }),
        });
        const genBody = await genRes.json();

        if (!genRes.ok) {
          // Provider-level failure (e.g. Ollama unreachable) - stop rather
          // than repeating the same broken call for every remaining
          // conversation.
          lastError = genBody.error ?? "Note generation failed.";
          failed = targets.length - i;
          break;
        }
        if (!genBody.ok) {
          failed++;
          lastError = genBody.error ?? null;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Note generation failed.";
        failed = targets.length - i;
        break;
      }
    }

    setProgress({ current: targets.length, total: targets.length, failed, lastError });
    setStatus("done");
    setMissingCount(failed);
    router.refresh();
  }

  if (missingCount === null || missingCount === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          {missingCount} conversation{missingCount === 1 ? "" : "s"} {missingCount === 1 ? "has" : "have"} no note yet.
        </p>
        <Button onClick={handleBackfill} disabled={status === "running"} size="sm" className="whitespace-nowrap">
          {status === "running" ? "Generating..." : "Generate missing notes"}
        </Button>
      </div>

      {status === "running" && progress && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            Generating {progress.current} of {progress.total}...
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && progress && progress.failed > 0 && (
        <p className="mt-2 text-xs text-destructive">
          {progress.failed} failed{progress.lastError ? `: ${progress.lastError}` : "."}
        </p>
      )}
    </div>
  );
}
