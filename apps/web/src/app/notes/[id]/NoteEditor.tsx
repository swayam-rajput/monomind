"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NoteData {
  id: string;
  conversationId: string;
  conversationTitle: string;
  titleOverride: string | null;
  summary: string;
  topics: string[];
  keyIdeas: string[];
  decisions: string[];
  openQuestions: string[];
}

export function NoteEditor({ note }: { note: NoteData }) {
  const router = useRouter();
  const [titleOverride, setTitleOverride] = useState(note.titleOverride ?? "");
  const [summary, setSummary] = useState(note.summary);
  const [topics, setTopics] = useState(note.topics.join(", "));
  const [keyIdeas, setKeyIdeas] = useState(note.keyIdeas.join("\n"));
  const [decisions, setDecisions] = useState(note.decisions.join("\n"));
  const [openQuestions, setOpenQuestions] = useState(note.openQuestions.join("\n"));

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [regenStatus, setRegenStatus] = useState<"idle" | "regenerating" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function linesToArray(text: string): string[] {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function csvToArray(text: string): string[] {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    setSaveStatus("saving");
    setError(null);

    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleOverride: titleOverride.trim() || null,
        summary,
        topics: csvToArray(topics),
        keyIdeas: linesToArray(keyIdeas),
        decisions: linesToArray(decisions),
        openQuestions: linesToArray(openQuestions),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
  }

  async function handleRegenerate() {
    if (!confirm("This will overwrite your current edits with a freshly generated note. Continue?")) return;

    setRegenStatus("regenerating");
    setError(null);

    const res = await fetch(`/api/notes/${note.id}/regenerate`, { method: "POST" });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "Regeneration failed.");
      setRegenStatus("error");
      return;
    }

    setTitleOverride(body.titleOverride ?? "");
    setSummary(body.summary);
    setTopics((JSON.parse(body.topics) as string[]).join(", "));
    setKeyIdeas((JSON.parse(body.keyIdeas) as string[]).join("\n"));
    setDecisions((JSON.parse(body.decisions) as string[]).join("\n"));
    setOpenQuestions((JSON.parse(body.openQuestions) as string[]).join("\n"));
    setRegenStatus("idle");
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This can't be undone. The source conversation is not affected.")) return;

    setDeleteStatus("deleting");
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete.");
      setDeleteStatus("error");
      return;
    }

    router.push("/notes");
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href="/notes" className="text-sm text-muted-foreground underline">
          &larr; All notes
        </Link>
        <Link href={`/conversations/${note.conversationId}`} className="text-sm text-muted-foreground underline">
          View source conversation &rarr;
        </Link>
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Title override</label>
        <input
          value={titleOverride}
          onChange={(e) => setTitleOverride(e.target.value)}
          placeholder={note.conversationTitle}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Topics (comma-separated)</label>
        <input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Key ideas (one per line)</label>
        <textarea
          value={keyIdeas}
          onChange={(e) => setKeyIdeas(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Decisions (one per line)</label>
        <textarea
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase text-muted-foreground">Open questions (one per line)</label>
        <textarea
          value={openQuestions}
          onChange={(e) => setOpenQuestions(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saveStatus === "saving" ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenStatus === "regenerating"}
          className="rounded border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {regenStatus === "regenerating" ? "Regenerating..." : "Regenerate from source"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteStatus === "deleting"}
          className="rounded border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50"
        >
          {deleteStatus === "deleting" ? "Deleting..." : "Delete note"}
        </button>
        {saveStatus === "saved" && <span className="self-center text-sm text-green-600">Saved.</span>}
      </div>
    </>
  );
}
