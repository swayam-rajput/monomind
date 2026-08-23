"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateNoteBackground, subscribeNoteJob, getNoteJobState } from "@/lib/noteJobStore";

interface Props {
  conversationId: string;
  stopPropagation?: boolean;
}

export function GenerateNoteButton({ conversationId, stopPropagation = false }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(() => getNoteJobState().running);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    return subscribeNoteJob((s) => {
      setRunning(s.running);
      // If this specific conversation's note just finished, refresh the
      // server component so the note section appears without a manual reload.
      if (!s.running && s.done.includes(conversationId)) {
        setJustFinished(true);
        router.refresh();
      }
    });
  }, [conversationId, router]);

  async function handleClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    // Fire and forget — the job runs in noteJobStore, survives navigation,
    // and the Sonner toast (shown inside the store) keeps the user informed.
    void generateNoteBackground(conversationId);
  }

  if (justFinished) return null; // note section will appear via router.refresh()

  return (
    <Button size="sm" onClick={handleClick} disabled={running}>
      {running ? "Generating..." : "Generate note"}
    </Button>
  );
}
