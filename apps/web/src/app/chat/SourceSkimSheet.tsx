"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import Markdown from "@/components/Markdown";

interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

interface SourceSkimSheetProps {
  conversationId: string | null;
  messageId: string | null;
  onClose: () => void;
}

export default function SourceSkimSheet({
  conversationId,
  messageId,
  onClose,
}: SourceSkimSheetProps) {
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);
    setData(null);

    fetch(`/api/conversations/${conversationId}`)
      .then((response) => response.json())
      .then((body) => setData(body))
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <Sheet
      open={conversationId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border/60 bg-background p-0 sm:max-w-lg dark:border-white/[0.07]"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left dark:border-white/[0.07]">
          {loading ? (
            <div className="space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                  Source
                </span>

                {data && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">
                    {data.messages.length}{" "}
                    {data.messages.length === 1
                      ? "message"
                      : "messages"}
                  </span>
                )}
              </div>

              <SheetTitle className="pr-8 text-base font-semibold leading-6 tracking-tight">
                {data?.title ?? "Loading source…"}
              </SheetTitle>

              <SheetDescription className="mt-1.5 text-xs leading-5">
                {data && (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      {new Date(data.createdAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>

                    <span className="text-border">·</span>

                    <Link
                      href={`/conversations/${data.id}`}
                      className="inline-flex items-center gap-1 font-medium text-foreground/70 transition-colors hover:text-foreground"
                    >
                      Open conversation
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </span>
                )}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-6 px-6 py-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />

                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="px-6 py-6">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute bottom-3 left-[7px] top-3 w-px bg-border/60 dark:bg-white/[0.07]"
                />

                <div className="space-y-7">
                  {data.messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const isRelevant = message.id === messageId;

                    return (
                      <div
                        key={message.id}
                        className={[
                          "relative pl-7 transition-opacity duration-300",
                          messageId && !isRelevant
                            ? "opacity-25"
                            : "opacity-100",
                        ].join(" ")}
                      >
                        <div
                          aria-hidden
                          className={[
                            "absolute left-0 top-1.5 flex items-center justify-center rounded-full bg-background",
                            isRelevant ? "size-4" : "size-3.5",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "rounded-full",
                              isRelevant
                                ? "size-2 bg-foreground dark:bg-white"
                                : isUser
                                  ? "size-1.5 bg-foreground/50"
                                  : "size-1.5 bg-muted-foreground/30",
                            ].join(" ")}
                          />
                        </div>

                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                            {isUser ? "You" : "Assistant"}
                          </span>

                          <span className="text-[10px] tabular-nums text-muted-foreground/35">
                            {index + 1}
                          </span>
                        </div>

                        <div
                          className={[
                            "relative text-[13px] leading-6",
                            isUser
                              ? "rounded-xl bg-muted/60 px-3.5 py-3 text-foreground dark:bg-white/[0.045]"
                              : "text-foreground/75",
                            isRelevant
                              ? "rounded-xl bg-foreground/[0.04] px-4 py-3.5 text-foreground ring-1 ring-foreground/10 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.3)] dark:bg-white/[0.05] dark:text-white/[0.92] dark:ring-white/10"
                              : "",
                          ].join(" ")}
                        >
                          {isRelevant && (
                            <div
                              aria-hidden
                              className="absolute -left-px top-3 bottom-3 w-0.5 rounded-full bg-foreground/50 dark:bg-white/50"
                            />
                          )}

                          <Markdown content={message.content} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <p className="text-sm text-muted-foreground">
                Unable to load this source.
              </p>
            </div>
          )}
        </div>

        {data && (
          <div className="shrink-0 border-t border-border/60 px-6 py-3 dark:border-white/[0.07]">
            <Link
              href={`/conversations/${data.id}`}
              className="flex items-center justify-between text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>View full conversation</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}