"use client";

import { useState } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface Props {
  messages: Message[];
  /** How many messages to show before collapsing the rest. */
  previewCount?: number;
}

/**
 * Renders the message timeline for a conversation with a collapsible
 * "Show all N messages" toggle. The first `previewCount` messages are
 * always visible; the rest are revealed on demand.
 *
 * Uses a plain JS open/close state rather than the Base UI collapsible
 * (which relies on a Tailwind v4-only CSS variable utility). This keeps
 * the animation simple (max-height + opacity transition on the hidden
 * portion) without needing a polyfill or library upgrade.
 */
export function MessagesSection({ messages, previewCount = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);

  const alwaysVisible = messages.slice(0, previewCount);
  const hidden = messages.slice(previewCount);
  const hasHidden = hidden.length > 0;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Messages</h2>
        <span className="text-xs text-muted-foreground">{messages.length} total</span>
      </div>

      {/* Always-visible preview messages */}
      <div className="flex flex-col">
        {alwaysVisible.map((m, i) => (
          <MessageRow
            key={m.id}
            message={m}
            showDivider={i < alwaysVisible.length - 1 || (hasHidden && !expanded)}
          />
        ))}
      </div>

      {/* Collapsible remainder */}
      {hasHidden && (
        <>
          <div
            className={[
              "flex flex-col overflow-hidden transition-all duration-300",
              expanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0",
            ].join(" ")}
            aria-hidden={!expanded}
          >
            {hidden.map((m, i) => (
              <MessageRow
                key={m.id}
                message={m}
                showDivider={i < hidden.length - 1}
              />
            ))}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                Show {hidden.length} more message{hidden.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </>
      )}
    </section>
  );
}

function MessageRow({
  message: m,
  showDivider,
}: {
  message: Message;
  showDivider: boolean;
}) {
  const isUser = m.role === "user";
  const isSystem = m.role === "system";

  return (
    <div
      className={[
        "flex gap-3 py-3",
        showDivider ? "border-b border-border/50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          isUser
            ? "bg-primary/10 text-primary"
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-muted/60 text-foreground/60",
        ].join(" ")}
      >
        {m.role}
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
        {m.content}
      </p>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10l4-4 4 4" />
    </svg>
  );
}
