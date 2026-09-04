"use client";

import { useRouter } from "next/navigation";
import { ReEmbedButton } from "./ReEmbedButton";

interface ClientReEmbedButtonProps {
  conversationId: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  stopPropagation?: boolean;
}

export function ClientReEmbedButton(props: ClientReEmbedButtonProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return <ReEmbedButton {...props} onSuccess={handleSuccess} />;
}