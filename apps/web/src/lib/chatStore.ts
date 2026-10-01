"use client";

import { toast } from "@/components/ui/toast";

/**
 * Module-level store for chat sessions and in-flight streaming, mirroring
 * importJobStore.ts. Keeping this outside React state means an active
 * "ask" streaming response keeps reading and appending tokens even if the
 * user navigates to another page and back (or switches sessions) - only
 * the component that renders the messages is torn down and rebuilt, the
 * underlying fetch/stream loop here is not.
 */

export interface Citation {
  index: number;
  conversationId: string;
  conversationTitle: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  streaming?: boolean;
}

interface SessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

const sessions = new Map<string, SessionState>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeChatStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getOrCreateSession(sessionId: string): SessionState {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { messages: [], isStreaming: false, error: null };
    sessions.set(sessionId, s);
  }
  return s;
}

export function getSessionState(sessionId: string): SessionState {
  return getOrCreateSession(sessionId);
}

/** Loads a session's persisted history from the server into the store (only if not already loaded). */
export async function ensureSessionLoaded(sessionId: string): Promise<void> {
  const s = getOrCreateSession(sessionId);
  if (s.messages.length > 0) return;

  const res = await fetch(`/api/chat/session/${sessionId}`);
  if (!res.ok) return;
  const body = await res.json();

  s.messages = body.messages.map(
    (m: { id: string; role: "user" | "assistant"; content: string; citations: Citation[] }) => ({
      id: m.id,
      role: m.role,
      text: m.content,
      citations: m.citations.length > 0 ? m.citations : undefined,
    })
  );
  notify();
}

/** Sends a question in the given session and streams the answer into the store, regardless of which page is mounted when it finishes. */
export async function sendChatMessage(sessionId: string, question: string): Promise<void> {
  const s = getOrCreateSession(sessionId);
  if (s.isStreaming) return;

  s.error = null;
  s.isStreaming = true;
  s.messages = [
    ...s.messages,
    { id: `local-${Date.now()}-u`, role: "user", text: question },
    { id: `local-${Date.now()}-a`, role: "assistant", text: "", streaming: true },
  ];
  notify();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, sessionId }),
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
        const last = s.messages[s.messages.length - 1];

        if (event.type === "chunk") {
          s.messages = [...s.messages.slice(0, -1), { ...last, text: last.text + event.text }];
          notify();
        } else if (event.type === "citations") {
          s.messages = [...s.messages.slice(0, -1), { ...last, citations: event.citations }];
          notify();
        } else if (event.type === "error") {
          throw new Error(event.error);
        } else if (event.type === "done") {
          s.messages = [...s.messages.slice(0, -1), { ...last, streaming: false }];
          notify();
        }
      }
    }
  } catch (err) {
    s.error = err instanceof Error ? err.message : "Chat failed.";
    s.messages = s.messages.slice(0, -1); // drop the empty assistant bubble
    notify();
    // Toast the error so the user gets feedback even if they navigated away
    // from /chat while the response was streaming.
    toast.error("Chat failed", {
      description: s.error,
    });
  } finally {
    s.isStreaming = false;
    notify();
  }
}
