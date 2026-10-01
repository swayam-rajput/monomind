"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface Props {
  conversationId: string;
  redirectAfter?: boolean;
  onDeleted?: () => void;
  stopPropagation?: boolean;
  size?: "sm" | "default";
}

export function DeleteConversationButton({
  conversationId,
  redirectAfter = false,
  onDeleted,
  stopPropagation = false,
  size = "default",
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    if (!window.confirm("Delete this conversation? This also removes its note and embeddings. This can't be undone.")) return;

    setDeleting(true);
    const toastId = toast.loading("Deleting conversation…");

    try {
      const res = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Failed to delete", { id: toastId, description: body.error });
        return;
      }

      toast.success("Conversation deleted", { id: toastId });

      if (redirectAfter) {
        router.push("/conversations");
      } else {
        onDeleted?.();
        router.refresh();
      }
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
    <Button
      variant="destructive"
      size={size}
      disabled={deleting}
      onClick={handleDelete}
    >
      {deleting ? "Deleting…" : "Delete conversation"}
    </Button>
  );
}
