"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface ReEmbedButtonProps {
  conversationId: string;
  onSuccess?: () => void;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  stopPropagation?: boolean;
}

export function ReEmbedButton({ 
  conversationId, 
  onSuccess,
  size = "default",
  variant = "default",
  className,
  stopPropagation = false,
}: ReEmbedButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleReEmbed = async (e?: React.MouseEvent) => {
    if (stopPropagation) {
      e?.stopPropagation();
      e?.preventDefault();
    }
    
    setIsLoading(true);
    const toastId = toast.loading("Re-embedding conversation…", {
      description: "Embedding chunks — this stays up until it finishes.",
      duration: Infinity,
    });

    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to re-embed conversation");
      }

      const { chunkCount, failedCount } = result;
      
      if (failedCount > 0) {
        toast.warning("Embedding partially completed", {
          id: toastId,
          description: `${chunkCount - failedCount}/${chunkCount} chunks embedded successfully. ${failedCount} failed.`,
        });
      } else {
        toast.success("Re-embedding completed", {
          id: toastId,
          description: `All ${chunkCount} chunks embedded successfully.`,
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Re-embedding failed:", error);
      toast.error("Re-embedding failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleReEmbed}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={className}
    >
      <RotateCcw className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-2`} />
      {isLoading ? "Re-embedding..." : "Re-embed"}
    </Button>
  );
}