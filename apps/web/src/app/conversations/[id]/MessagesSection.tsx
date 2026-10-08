"use client";

import { useEffect, useId, useRef, useState } from "react";
import Markdown from '@/components/Markdown';
import { ChevronDown, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface Props {
  messages: Message[];
}

const CLAMP_AT = 400; // characters before a message gets clamped

export function MessagesSection({ messages }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [hasExpanded, setHasExpanded] = useState(false);
  const contentId = useId();

  if (messages.length === 0) return null;

  const toggle = () => {
    setExpanded((v) => !v);
    setHasExpanded(true);
  };

  const visibleMessages = messages.slice(0, visibleCount);
  const hasMore = visibleCount < messages.length;

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="group flex w-full items-center justify-between border-b border-border/70 py-3 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-medium">Messages</span>

          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {messages.length}
          </span>
        </div>

        <ChevronDown
          className={[
            "size-4 text-muted-foreground transition-transform duration-300",
            "group-hover:text-foreground",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <div
        id={contentId}
        inert={!expanded}
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
          {hasExpanded && (
            <div className="space-y-8 py-6">
              {visibleMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                />
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + 20)
                  }
                  className="mx-auto block rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Show more
                  <span className="ml-1 text-muted-foreground/50">
                    ({messages.length - visibleCount} remaining)
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const contentId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  const isUser = message.role === "user";
  const isLong = message.content.length > CLAMP_AT;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; ignore */
    }
  };

  return (
    <article
      id={`message-${message.id}`}
      className={[
        " scroll-mt-20 target:bg-green-500/30 group  flex w-full flex-col",
        isUser ? "items-end" : "items-start",
      ].join(" ")}
    >
      {/* Message bubble */}
      <div
        className={
          isUser
            ? "max-w-[75%] rounded-xl bg-muted px-4 py-2.5"
            : "w-full"
        }
      >
        {/* Clickable message header */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div
            className={[
              "flex items-start gap-2",
              open ? "pb-2" : "",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              {!open && (
                <div
                  className={[
                    "relative",
                    isLong ? "max-h-24 overflow-hidden" : "",
                  ].join(" ")}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words text-[12px] leading-4 text-foreground">
                      {message.content}
                    </p>
                  ) : (
                    <Markdown content={message.content} />
                  )}

                  {isLong && (
                    <div
                      className={[
                        "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent",
                        isUser ? "from-muted" : "from-background",
                      ].join(" ")}
                    />
                  )}
                </div>
              )}

              {open && (
                <div id={contentId}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words text-[12px] leading-4 text-foreground">
                      {message.content}
                    </p>
                  ) : (
                    <Markdown content={message.content} />
                  )}
                </div>
              )}
            </div>

            <ChevronDown
              aria-hidden="true"
              className={[
                "mt-1 size-4 shrink-0 text-muted-foreground",
                "opacity-0 transition-all duration-200",
                "group-hover:opacity-100",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </div>
        </button>
      </div>

      {/* Actions */}
      <div
        className={[
          "mt-1.5 flex items-center gap-1",
          "opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 focus-within:opacity-100",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy message"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors
                     hover:bg-muted hover:text-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </article>
  );
}

