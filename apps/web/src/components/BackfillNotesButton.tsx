"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { backfillNotesBackground, subscribeNoteJob, getNoteJobState } from "@/lib/noteJobStore";

export function BackfillNotesButton() {
  const router = useRouter();
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [jobState, setJobState] = useState(getNoteJobState);

  useEffect(() => {
    fetch("/api/notes/missing")
      .then((r) => r.json())
      .then((b: { conversations: { id: string }[] }) => setMissingCount(b.conversations.length))
      .catch(() => setMissingCount(0));
  }, []);

  useEffect(() => {
    return subscribeNoteJob((s) => {
      setJobState(s);
      // When a bulk run finishes, refresh the server component so note
      // previews appear in the list.
      if (!s.running && s.done.length > 0) {
        setMissingCount((prev) => Math.max(0, (prev ?? 0) - s.done.length));
        router.refresh();
      }
    });
  }, [router]);

  if (missingCount === null || missingCount === 0) return null;

  const { running, current, total } = jobState;
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          {missingCount} conversation{missingCount === 1 ? "" : "s"}{" "}
          {missingCount === 1 ? "has" : "have"} no note yet.
        </p>
        <Button
          onClick={() => void backfillNotesBackground()}
          disabled={running}
          size="sm"
          className="whitespace-nowrap"
        >
          {running ? `Generating ${current}/${total}…` : "Generate missing notes"}
        </Button>
      </div>

      {running && total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Runs in the background — you can navigate away.
          </p>
        </div>
      )}
    </div>
  );
}
