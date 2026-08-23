"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { BotIcon, PencilEdit01Icon, Copy01Icon, ArrowUp01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import { SourceSkimSheet } from "./SourceSkimSheet";
import {
  ensureSessionLoaded,
  getSessionState,
  sendChatMessage,
  subscribeChatStore,
} from "@/lib/chatStore";

type PageStatus = "loading" | "empty-db" | "ready";
const MAX_TEXTAREA_HEIGHT_PX = 200;
const FALLBACK_PROMPTS = [
  "Search my conversations",
  "Summarize recent imports",
  "What decisions have I made recently?",
];

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session");

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [skimConversationId, setSkimConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [, forceRerender] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_PROMPTS);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function init() {
      const [countRes, listRes, settingsRes, suggestionsRes] = await Promise.all([
        fetch("/api/conversations/count").then((r) => r.json()).catch(() => ({ count: 0 })),
        fetch("/api/chat/session").then((r) => r.json()).catch(() => ({ sessions: [] })),
        fetch("/api/settings").then((r) => r.json()).catch(() => null),
        fetch("/api/chat/suggestions").then((r) => r.json()).catch(() => null),
      ]);

      if (settingsRes?.chatModel) setActiveModel(settingsRes.chatModel);
      if (suggestionsRes?.suggestions?.length) setSuggestions(suggestionsRes.suggestions);

      if (countRes.count === 0) {
        setPageStatus("empty-db");
        return;
      }

      let id = sessionIdFromUrl;
      if (!id) {
        id = listRes.sessions.length > 0
          ? listRes.sessions[0].id
          : (await fetch("/api/chat/session", { method: "POST" }).then((r) => r.json())).sessionId;
        router.replace(`/chat?session=${id}`);
      }

      setSessionId(id);
      setPageStatus("ready");
      ensureSessionLoaded(id!).then(() => forceRerender((n) => n + 1));
    }

    init().catch(() => setPageStatus("ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    return subscribeChatStore(() => forceRerender((n) => n + 1));
  }, [sessionId]);

  const session = sessionId ? getSessionState(sessionId) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, session?.messages[session.messages.length - 1]?.text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [input]);

  async function handleSelectSession(id: string) {
    setSessionId(id);
    router.replace(`/chat?session=${id}`);
    await ensureSessionLoaded(id);
    forceRerender((n) => n + 1);
  }

  async function handleNewChat() {
    const created = await fetch("/api/chat/session", { method: "POST" }).then((r) => r.json());
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion();
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /** Drops an assistant message back into the input so it can be edited and resent. */
  function editAsPrompt(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  if (pageStatus === "loading") {
    return (
      <main className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-7 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    );
  }

  if (pageStatus === "empty-db") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <HugeiconsIcon icon={BotIcon} strokeWidth={1.5} className="size-12 text-muted-foreground/40" />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Nothing to ask yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <a href="/import" className="underline underline-offset-2 transition-colors hover:text-foreground">
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
    <SidebarProvider className="h-full min-h-0" style={{ "--sidebar-width": "15rem" } as CSSProperties}>
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
              <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
                How can I help you today?
              </h2>

              <div className="flex w-full max-w-xl flex-wrap justify-center gap-2">
                {suggestions.map((p) => (
                  <button
                    key={p}
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
              <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-8">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <UserBubble key={m.id} text={m.text} />
                  ) : (
                    <AssistantBubble
                      key={m.id}
                      message={m}
                      isCopied={copiedId === m.id}
                      onCopy={() => copyText(m.id, m.text ?? "")}
                      onEdit={() => editAsPrompt(m.text ?? "")}
                      onCitationClick={setSkimConversationId}
                    />
                  )
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

      <SourceSkimSheet conversationId={skimConversationId} onClose={() => setSkimConversationId(null)} />
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
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] rounded-[20px] bg-muted/80 px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-2xs dark:bg-[#2f2f2f] dark:text-white">
        {text}
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
  message: { id: string; text: string; streaming?: boolean; citations?: { index: number; conversationId: string; conversationTitle: string }[] };
  isCopied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onCitationClick: (id: string) => void;
}) {
  const isThinking = !m.text;

  return (
    <div className="group/message flex flex-col gap-0">
      {/* Header: assistant indicator (left) + hover-revealed action toolbar (right) */}
      <div className="mb-2 flex h-6 items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isThinking && (
            <span className="text-xs font-medium text-muted-foreground">Thinking…</span>
          )}
        </div>

      </div>

      {/* Body */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-relaxed text-card-foreground shadow-2xs dark:border-white/8 dark:bg-white/5 dark:text-white/85">
        {m.streaming && !m.text ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">
            {m.text}
            {m.streaming && <span className="ml-0.5 animate-pulse opacity-70">▋</span>}
          </p>
        )}
        

        {m.citations && m.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3 dark:border-white/8">
            {m.citations.map((c) => (
              <button
                key={c.index}
                onClick={() => onCitationClick(c.conversationId)}
                className="rounded-full border border-border/40 bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                [{c.index}] {c.conversationTitle}
              </button>
            ))}
          </div>
        )}
      </div>
        {!isThinking && (
          <MessageActions isCopied={isCopied} onCopy={onCopy} onEdit={onEdit} />
        )}
    </div>
  );
}

/** Grouped, hover-revealed Edit / Copy toolbar for an assistant message. */
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
    <div className="flex items-center gap-0.5 rounded-full  p-0.5 opacity-0 transition-opacity group-hover/message:opacity-100">
      {/* <button
        onClick={onEdit}
        title="Use as draft"
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={1.5} className="size-3.5" />
      </button> */}

      <button
        onClick={onCopy}
        title={isCopied ? "Copied" : "Copy response"}
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <HugeiconsIcon icon={isCopied ? Tick01Icon : Copy01Icon} strokeWidth={1.5} className="size-3.5" />
      </button>
    </div>
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
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 dark:border-white/10 dark:bg-[#2f2f2f]">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        disabled={isStreaming}
        rows={1}
        style={{ maxHeight: MAX_TEXTAREA_HEIGHT_PX, resize: "none" }}
        className="min-h-[52px] w-full resize-none border-0 bg-transparent px-4 py-3 pr-14 text-sm leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent dark:text-white dark:placeholder:text-white/30"
      />

      <Button
        type="submit"
        size="icon"
        disabled={isStreaming || !input.trim()}
        className="absolute bottom-3 right-3 size-7 rounded-lg"
        aria-label="Send message"
        title="Send message"
      >
        <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2.5} className="size-4" />
      </Button>
    </div>
  );
}