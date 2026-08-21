"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryFailedChunksButton({ conversationId }: { conversationId: string }) {
  const [status, setStatus] = useState<"idle" | "retrying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRetry() {
    setStatus("retrying");
    setError(null);

    try {
      const res = await fetch("/api/embed/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Retry failed.");
        setStatus("error");
        return;
      }

      setStatus("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
      setStatus("error");
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleRetry}
        disabled={status === "retrying"}
        className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {status === "retrying" ? "Retrying..." : "Retry failed chunks"}
      </button>
      {status === "error" && error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
