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
  const initial = getNoteJobState();
  // Only show "Generating..." on THIS button, not every button on the page.
  const [thisIsRunning, setThisIsRunning] = useState(
    initial.activeConversationId === conversationId
  );
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    return subscribeNoteJob((s) => {
      setThisIsRunning(s.activeConversationId === conversationId);

      if (!s.running && s.done.includes(conversationId)) {
        setJustFinished(true);
        router.refresh();
      }
    });
  }, [conversationId, router]);

  async function handleClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    void generateNoteBackground(conversationId);
  }

  if (justFinished) return null;

  return (
    <Button size="sm" onClick={handleClick} disabled={thisIsRunning}>
      {thisIsRunning ? "Generating..." : "Generate note"}
    </Button>
  );
}
