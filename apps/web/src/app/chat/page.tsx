"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Citation {
  index: number;
  conversationId: string;
  conversationTitle: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  /** True while this assistant message is still streaming in. */
  streaming?: boolean;
}

type DbStatus = "checking" | "empty" | "ready";

export default function ChatPage() {
  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/conversations/count")
      .then((r) => r.json())
      .then((body: { count: number }) => setDbStatus(body.count === 0 ? "empty" : "ready"))
      .catch(() => setDbStatus("ready"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: question }, { role: "assistant", text: "", streaming: true }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Chat request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          const event = JSON.parse(line);
          if (event.type === "chunk") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, text: last.text + event.text };
              return next;
            });
          } else if (event.type === "citations") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, citations: event.citations };
              return next;
            });
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "done") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, streaming: false };
              return next;
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
      setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant bubble
    } finally {
      setIsStreaming(false);
    }
  }

  if (dbStatus === "checking") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (dbStatus === "empty") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-semibold">Ask your knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Nothing imported yet.{" "}
          <Link href="/import" className="underline">
            Import something first
          </Link>{" "}
          before asking questions.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Ask your knowledge base</h1>
      <p className="text-sm text-muted-foreground">
        Answers are grounded only in your imported conversations, with citations. If nothing relevant is found, it'll
        say so instead of guessing.
      </p>

      <div className="flex min-h-[300px] flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Ask something you know is in your imported data.</p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                : "self-start rounded-lg border border-border px-4 py-3 text-sm"
            }
          >
            <p className="whitespace-pre-wrap">
              {m.text || (m.streaming ? "Thinking..." : "")}
              {m.streaming && m.text && <span className="animate-pulse">&#9611;</span>}
            </p>

            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                {m.citations.map((c) => (
                  <Link
                    key={c.index}
                    href={`/conversations/${c.conversationId}`}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs underline"
                  >
                    [{c.index}] {c.conversationTitle}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isStreaming}
          className="flex-1 rounded border border-border bg-background p-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isStreaming ? "Thinking..." : "Ask"}
        </button>
      </form>
    </main>
  );
}
