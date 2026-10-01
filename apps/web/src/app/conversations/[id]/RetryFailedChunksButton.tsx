"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function RetryFailedChunksButton({ conversationId }: { conversationId: string }) {
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();

  async function handleRetry() {
    setRetrying(true);
    const toastId = toast.loading("Retrying failed chunks…", {
      description: "This runs in the background — you can navigate away.",
      duration: Infinity,
    });

    try {
      const res = await fetch("/api/embed/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error("Retry failed", { id: toastId, description: body.error ?? "Something went wrong." });
      } else if (body.stillFailed > 0) {
        toast.warning(`${body.stillFailed} chunk${body.stillFailed !== 1 ? "s" : ""} still failing`, {
          id: toastId,
          description: "Check that Ollama is running and try again.",
        });
        router.refresh();
      } else {
        toast.success("All chunks embedded", { id: toastId });
        router.refresh();
      }
    } catch (err) {
      toast.error("Retry failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="mt-3">
      <Button onClick={handleRetry} disabled={retrying} size="sm">
        {retrying ? "Retrying..." : "Retry failed chunks"}
      </Button>
    </div>
  );
}
