"use client";

import { useId, useState } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface Props {
  messages: Message[];
  /** Number of messages visible before collapsing the rest. */
  previewCount?: number;
}

export function MessagesSection({
  messages,
  previewCount = 4,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const visibleMessages = messages.slice(0, previewCount);
  const hiddenMessages = messages.slice(previewCount);
  const hasHiddenMessages = hiddenMessages.length > 0;

  const toggleExpanded = () => setExpanded((value) => !value);

  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Messages</h2>

        <span className="text-xs text-muted-foreground">
          {messages.length} total
        </span>
      </header>

      <div>
        {visibleMessages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            showDivider={
              index < visibleMessages.length - 1 ||
              (hasHiddenMessages && !expanded)
            }
          />
        ))}
      </div>

      {hasHiddenMessages && (
        <>
          <div
            id={contentId}
            className={[
              "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
              expanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            ].join(" ")}
            aria-hidden={!expanded}
          >
            <div className="min-h-0 overflow-hidden">
              {hiddenMessages.map((message, index) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  showDivider={index < hiddenMessages.length - 1}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={contentId}
            className={[
              "mt-3 flex w-full items-center justify-center gap-1.5",
              "rounded-md border border-border",
              "bg-muted/30 px-3 py-2",
              "text-xs font-medium text-muted-foreground",
              "transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2",
            ].join(" ")}
          >
            {expanded ? (
              <>
                <ChevronUp />
                Show less
              </>
            ) : (
              <>
                <ChevronDown />
                Show {hiddenMessages.length} more message
                {hiddenMessages.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </>
      )}
    </section>
  );
}

function MessageRow({
  message,
  showDivider,
}: {
  message: Message;
  showDivider: boolean;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <article
      className={[
        "flex gap-3 py-3",
        showDivider ? "border-b border-border/50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5",
          "text-[10px] font-semibold uppercase tracking-wider",
          isUser
            ? "bg-primary/10 text-primary"
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-muted/60 text-foreground/60",
        ].join(" ")}
      >
        {message.role}
      </span>

      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
        {message.content}
      </p>
    </article>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
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

function ChevronUp() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
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