"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DeleteAllButton({ count }: { count: number }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDeleteAll() {
    if (
      !window.confirm(
        `Delete all ${count} conversation${count === 1 ? "" : "s"} and their notes/embeddings? This cannot be undone.`
      )
    )
      return;

    setDeleting(true);
    const toastId = toast.loading(`Deleting ${count} conversation${count === 1 ? "" : "s"}…`);

    try {
      const res = await fetch("/api/conversations/delete-all", { method: "DELETE" });
      const body = await res.json();

      if (!res.ok) {
        toast.error("Failed to delete", { id: toastId, description: body.error });
        return;
      }

      toast.success(`Deleted ${body.count} conversation${body.count === 1 ? "" : "s"}`, { id: toastId });
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete", {
        id: toastId,
        description: err instanceof Error ? err.message : "Unexpected error.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteAll}>
      {deleting ? "Deleting…" : "Delete all"}
    </Button>
  );
}
