"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  messages: { id: string; role: string; content: string; createdAt: string }[];
}

interface SourceSkimSheetProps {
  conversationId: string | null;
  onClose: () => void;
}

/** Right-hand panel for skimming a cited conversation's messages without leaving /chat. */
export function SourceSkimSheet({ conversationId, onClose }: SourceSkimSheetProps) {
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    setData(null);
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((body) => setData(body))
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <Sheet open={conversationId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{data?.title ?? "Loading..."}</SheetTitle>
          <SheetDescription>
            {data && (
              <>
                {new Date(data.createdAt).toLocaleString()} &middot;{" "}
                <Link href={`/conversations/${data.id}`} className="text-[#0000ee] underline">
                  Open full conversation
                </Link>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {data && (
            <div className="flex flex-col gap-3">
              {data.messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{m.role}</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
