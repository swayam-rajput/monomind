"use client";

import { useEffect, useId, useRef, useState, Suspense, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BotIcon,
  Copy01Icon,
  ArrowUp01Icon,
  Tick01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import {
  ensureSessionLoaded,
  getSessionState,
  sendChatMessage,
  subscribeChatStore,
} from "@/lib/chatStore";
import { ChevronDown } from "lucide-react";
import Markdown from "@/components/Markdown";

type PageStatus = "loading" | "empty-db" | "ready";

const MAX_TEXTAREA_HEIGHT_PX = 200;

const FALLBACK_PROMPTS = [
  "Search my conversations",
  "Summarize recent imports",
  "What decisions have I made recently?",
];

export default function ChatPage() {
  // useSearchParams() below needs a suspense boundary, otherwise the
  // build-time static prerender of this page fails.
  return (
    <Suspense
      fallback={
        <main className="flex h-full items-center justify-center">
          <div className="size-7 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </main>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session");

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  const [input, setInput] = useState("");
  const [, forceRerender] = useState(0);
  const [suggestions, setSuggestions] =
    useState<string[]>(FALLBACK_PROMPTS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function init() {
      const [countRes, listRes, suggestionsRes] =
        await Promise.all([
          fetch("/api/conversations/count")
            .then((r) => r.json())
            .catch(() => ({ count: 0 })),
          fetch("/api/chat/session")
            .then((r) => r.json())
            .catch(() => ({ sessions: [] })),
          fetch("/api/chat/suggestions")
            .then((r) => r.json())
            .catch(() => null),
        ]);

      if (suggestionsRes?.suggestions?.length) {
        setSuggestions(suggestionsRes.suggestions);
      }

      setConversationCount(countRes.count);

      if (countRes.count === 0) {
        setPageStatus("empty-db");
        return;
      }

      let id = sessionIdFromUrl;

      if (!id) {
        id =
          listRes.sessions.length > 0
            ? listRes.sessions[0].id
            : (
              await fetch("/api/chat/session", {
                method: "POST",
              }).then((r) => r.json())
            ).sessionId;

        router.replace(`/chat?session=${id}`);
      }

      setSessionId(id);
      setPageStatus("ready");

      ensureSessionLoaded(id!).then(() =>
        forceRerender((n) => n + 1),
      );
    }

    init().catch(() => setPageStatus("ready"));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    return subscribeChatStore(() =>
      forceRerender((n) => n + 1),
    );
  }, [sessionId]);

  const session = sessionId ? getSessionState(sessionId) : null;
  const messageCount = session?.messages.length ?? 0;
  const lastMessageText =
    messageCount > 0 && session
      ? session.messages[messageCount - 1]?.text
      : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messageCount, lastMessageText]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(
      el.scrollHeight,
      MAX_TEXTAREA_HEIGHT_PX,
    )}px`;
  }, [input]);

  async function handleSelectSession(id: string) {
    setSessionId(id);
    router.replace(`/chat?session=${id}`);
    await ensureSessionLoaded(id);
    forceRerender((n) => n + 1);
  }

  async function handleNewChat() {
    const created = await fetch("/api/chat/session", {
      method: "POST",
    }).then((r) => r.json());

    setSessionId(created.sessionId);
    router.replace(`/chat?session=${created.sessionId}`);
    setSidebarRefreshKey((n) => n + 1);
  }

  async function sendQuestion() {
    const question = input.trim();

    if (!question || !sessionId || session?.isStreaming) return;

    setInput("");
    await sendChatMessage(sessionId, question);
    setSidebarRefreshKey((n) => n + 1);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion();
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text).catch(() => { });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function editAsPrompt(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  if (pageStatus === "loading") {
    return (
      <main className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-7 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading…
          </p>
        </div>
      </main>
    );
  }

  if (pageStatus === "empty-db") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <HugeiconsIcon
          icon={BotIcon}
          strokeWidth={1.5}
          className="size-12 text-muted-foreground/40"
        />

        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Nothing to ask yet
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            <a
              href="/import"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Import your conversations
            </a>{" "}
            to start chatting with your knowledge base.
          </p>
        </div>
      </main>
    );
  }

  const messages = session?.messages ?? [];
  const isStreaming = session?.isStreaming ?? false;
  const error = session?.error ?? null;

  return (
    <SidebarProvider
      className="h-[calc(100dvh-2.5rem)] min-h-0"
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <ChatSidebar
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        refreshKey={sidebarRefreshKey}
      />

      <SidebarInset className="min-h-0 overflow-hidden bg-background">
        <div className="flex h-full min-h-0 flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Ask your memory anything
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Answers are grounded in your {conversationCount}{" "}
                  {conversationCount === 1 ? "imported conversation" : "imported conversations"}. Cited sources link back to the message they
                  came from.
                </p>
              </div>

              <div className="flex w-full max-w-xl flex-wrap justify-center gap-2">
                {suggestions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setInput(p);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs transition-all hover:border-foreground/20 hover:bg-muted hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {error && <ErrorBanner message={error} />}
            </div>
          ) : (
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-8">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <UserBubble
                      key={m.id}
                      text={m.text}
                    />
                  ) : (
                    <AssistantBubble
                      key={m.id}
                      message={m}
                      isCopied={copiedId === m.id}
                      onCopy={() =>
                        copyText(m.id, m.text ?? "")
                      }
                      onEdit={() =>
                        editAsPrompt(m.text ?? "")
                      }
                      onCitationClick={(conversationId, messageId) =>
                        router.push(
                          `/conversations/${conversationId}#message-${messageId}`,
                        )
                      }
                    />
                  ),
                )}

                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {error && messages.length > 0 && (
            <div className="mx-auto w-full max-w-[680px] shrink-0 px-4 pb-2">
              <ErrorBanner message={error} />
            </div>
          )}

          <div className="shrink-0 px-4 pb-3 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendQuestion();
              }}
              className="mx-auto w-full max-w-[680px]"
            >
              <ChatInputBar
                textareaRef={textareaRef}
                input={input}
                setInput={setInput}
                handleKeyDown={handleKeyDown}
                isStreaming={isStreaming}
              />
            </form>

            <p className="mt-2 text-center text-[11px] text-muted-foreground/50 dark:text-white/20">
              AI can make mistakes. Double-check important info.
            </p>
          </div>
        </div>
      </SidebarInset>


    </SidebarProvider>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 400;
  const contentId = useId();

  return (
    <div className="flex justify-end">
      <div className="group/user max-w-[72%]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className="w-full rounded-[20px] border border-border bg-card px-4 py-2.5 text-left text-sm leading-relaxed text-foreground shadow-2xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-card dark:text-white"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {open ? (
                <p
                  id={contentId}
                  className="whitespace-pre-wrap break-words"
                >
                  {text}
                </p>
              ) : (
                <div className="relative max-h-24 overflow-hidden">
                  <p className="whitespace-pre-wrap break-words">
                    {text}
                  </p>

                  {isLong && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent dark:from-card" />
                  )}
                </div>
              )}
            </div>

            {isLong && (
              <ChevronDown
                aria-hidden="true"
                className={[
                  "mt-0.5 size-4 shrink-0 text-muted-foreground",
                  "opacity-0 transition-all duration-200",
                  "group-hover/user:opacity-100",
                  open ? "rotate-180" : "",
                ].join(" ")}
              />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function AssistantBubble({
  message: m,
  isCopied,
  onCopy,
  onEdit,
  onCitationClick,
}: {
  message: {
    id: string;
    text: string;
    streaming?: boolean;
    citations?: {
      index: number;
      conversationId: string;
      conversationTitle: string;
      messageId: string;
    }[];
  };
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onCitationClick: (
    conversationId: string,
    messageId: string,
  ) => void;
}) {
  const isThinking = !m.text;

  return (
    <div className="group/message relative flex flex-col">
      {isThinking && (
        <div className="mb-3 flex items-center gap-2 pl-1">
          <span className="relative flex size-4 items-center justify-center">
            <span className="absolute size-4 animate-ping rounded-full bg-foreground/10" />
            <span className="size-1.5 rounded-full bg-foreground/50" />
          </span>

          <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70">
            Thinking
          </span>
        </div>
      )}

      <div className="relative">
        {m.streaming && !m.text ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="typing-dots flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              <span className="size-1.5 rounded-full bg-muted-foreground" />
            </span>
          </div>
        ) : (
          <div className="text-[14px] leading-[1.8] tracking-[-0.005em] text-foreground/85 dark:text-white/[0.86]">
            <Markdown content={m.text} />

            {m.streaming && (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-[1em] w-[6px] translate-y-[2px] animate-pulse bg-foreground/40 dark:bg-white/40"
              />
            )}
          </div>
        )}

        {m.citations && m.citations.length > 0 && (
          <div className="mt-6">
            <hr />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.citations.map((c) => (
                <button
                  key={c.index}
                  type="button"
                  onClick={() =>
                    onCitationClick(c.conversationId, c.messageId)
                  }
                  title={c.conversationTitle}
                  className="group/source flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
                >
                  <span className="font-medium tabular-nums text-foreground/70 group-hover/source:text-foreground">
                    [{c.index}]
                  </span>
                  <span className="max-w-[140px] truncate">
                    {c.conversationTitle}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isThinking && (
        <div className="mt-1 flex h-7 items-center opacity-0 transition-opacity duration-200 group-hover/message:opacity-100 focus-within:opacity-100">
          <MessageActions
            isCopied={isCopied}
            onCopy={onCopy}
            onEdit={onEdit}
          />
        </div>
      )}
    </div>
  );
}

function MessageActions({
  isCopied,
  onCopy,
  onEdit,
}: {
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCopy}
        title={isCopied ? "Copied" : "Copy response"}
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 hover:bg-background hover:text-foreground"
      >
        <HugeiconsIcon
          icon={isCopied ? Tick01Icon : Copy01Icon}
          strokeWidth={1.5}
          className="size-3.5"
        />
      </button>
      <button
        type="button"
        onClick={onEdit}
        title="Edit as prompt"
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 hover:bg-background hover:text-foreground"
      >
        <HugeiconsIcon
          icon={PencilEdit01Icon}
          strokeWidth={1.5}
          className="size-3.5"
        />
      </button>
    </>
  );
}

function ChatInputBar({
  textareaRef,
  input,
  setInput,
  handleKeyDown,
  isStreaming,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (v: string) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 dark:border-white/10 dark:bg-[#2f2f2f]">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        disabled={isStreaming}
        rows={1}
        style={{
          maxHeight: MAX_TEXTAREA_HEIGHT_PX,
          resize: "none",
        }}
        className="min-h-[52px] w-full resize-none border-0 bg-transparent px-4 py-3 pr-14 text-sm leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-ring/25 dark:bg-transparent dark:text-white dark:placeholder:text-white/30"
      />

      <Button
        type="submit"
        size="icon"
        disabled={isStreaming || !input.trim()}
        className="absolute bottom-3 right-3 size-7 rounded-lg"
        aria-label="Send message"
        title="Send message (Enter)"
      >
        <HugeiconsIcon
          icon={ArrowUp01Icon}
          strokeWidth={2.5}
          className="size-4"
        />
      </Button>
    </div>
  );
}