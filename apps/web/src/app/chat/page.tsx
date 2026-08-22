"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for an empty DB once, then resolve which session to show: the
  // one from the URL, or create/reuse one and put it in the URL so
  // refreshing keeps you on the same chat.
  useEffect(() => {
    async function init() {
      const countRes = await fetch("/api/conversations/count").then((r) => r.json());
      if (countRes.count === 0) {
        setPageStatus("empty-db");
        return;
      }

      let id = sessionIdFromUrl;
      if (!id) {
        const listRes = await fetch("/api/chat/session").then((r) => r.json());
        if (listRes.sessions.length > 0) {
          id = listRes.sessions[0].id;
        } else {
          const created = await fetch("/api/chat/session", { method: "POST" }).then((r) => r.json());
          id = created.sessionId;
        }
        router.replace(`/chat?session=${id}`);
      }

      setSessionId(id);
      await ensureSessionLoaded(id!);
      setPageStatus("ready");
    }

    init().catch(() => setPageStatus("ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-subscribe whenever the active session changes, and re-render on
  // every store update (streaming tokens, etc). The store itself is
  // module-level, so it keeps running even across a session switch or a
  // navigation away from /chat entirely.
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
    setSidebarRefreshKey((n) => n + 1); // refresh sidebar preview/order after a message
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendQuestion();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion();
    }
  }

  if (pageStatus === "loading") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (pageStatus === "empty-db") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold">Ask your knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Nothing imported yet.{" "}
          <a href="/import" className="text-[#0000ee] underline">
            Import something first
          </a>{" "}
          before asking questions.
        </p>
      </main>
    );
  }

  const messages = session?.messages ?? [];
  const isStreaming = session?.isStreaming ?? false;
  const error = session?.error ?? null;

  return (
<SidebarProvider
  className="h-full min-h-0"
  style={{ "--sidebar-width": "16rem" } as CSSProperties}
>
  <ChatSidebar
    activeSessionId={sessionId}
    onSelectSession={handleSelectSession}
    onNewChat={handleNewChat}
    refreshKey={sidebarRefreshKey}
  />

  <SidebarInset className="min-h-0">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 border-b px-6 py-4 hidden">
        <div>
          <h1 className="text-lg font-semibold">
            Ask your knowledge base
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            Answers are grounded only in your imported conversations, with
            citations.
          </p>
        </div>
      </header>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-6">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask something you know is in your imported data.
            </p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "max-w-[85%] self-end rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] self-start rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">
                {m.text || (m.streaming ? "Thinking..." : "")}
                {m.streaming && m.text && (
                  <span className="animate-pulse">&#9611;</span>
                )}
              </p>

              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                  {m.citations.map((c) => (
                    <button
                      key={c.index}
                      onClick={() =>
                        setSkimConversationId(c.conversationId)
                      }
                      className="rounded-full bg-muted px-2 py-0.5 text-xs underline"
                    >
                      [{c.index}] {c.conversationTitle}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-2 w-full max-w-2xl px-6">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t px-6 py-4"
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Shift+Enter for a new line)"
            disabled={isStreaming}
            rows={1}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT_PX }}
            className="flex-1"
          />

          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            size="lg"
          >
            {isStreaming ? "Thinking..." : "Ask"}
          </Button>
        </div>
      </form>
    </div>
  </SidebarInset>

  <SourceSkimSheet
    conversationId={skimConversationId}
    onClose={() => setSkimConversationId(null)}
  />
</SidebarProvider>
  );
}
