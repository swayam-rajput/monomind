"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SearchApiResult } from "@/app/api/search/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Status = "idle" | "checking" | "empty-db" | "searching" | "done" | "error";

export default function SearchPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchApiResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conversations/count")
      .then((r) => r.json())
      .then((body: { count: number }) => setStatus(body.count === 0 ? "empty-db" : "idle"))
      .catch(() => setStatus("idle"));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("searching");
    setError(null);
    setResults(null);

    const toastId = toast.loading("Searching…");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body.error ?? "Search failed.";
        setError(msg);
        setStatus("error");
        toast.error("Search failed", { id: toastId, description: msg });
        return;
      }
      const found = body.results as SearchApiResult[];
      setResults(found);
      setStatus("done");
      toast.dismiss(toastId);
      if (found.length === 0) {
        toast.info("No matches found", {
          description: "Try a different query or check that conversations are embedded.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed.";
      setError(msg);
      setStatus("error");
      toast.error("Search failed", { id: toastId, description: msg });
    }
  }

  if (status === "checking") {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  if (status === "empty-db") {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold">Search</h1>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing imported yet.{" "}
            <Link href="/import" className="text-link underline underline-offset-3">
              Import something first
            </Link>{" "}
            before you can search.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your conversations..."
          className="flex-1"
        />
        <Button type="submit" disabled={status === "searching"}>
          {status === "searching" ? "Searching…" : "Search"}
        </Button>
      </form>

      {status === "searching" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-3.5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          Embedding query and searching — may take a moment on local Ollama.
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "done" && results && (
        results.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium">No matches found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try different keywords, or check that your conversations have been embedded in{" "}
              <Link href="/conversations" className="text-link underline underline-offset-3">
                Conversations
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-3">
              {results.map((r) => (
                <li key={r.chunkId} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/conversations/${r.conversationId}`} className="text-sm font-medium text-link underline underline-offset-3">
                      {r.note?.titleOverride ?? r.conversationTitle}
                    </Link>
                    <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {Math.round((1 - r.distance) * 100)}% match
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(r.conversationCreatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                  {r.note && <p className="mt-2 text-xs text-muted-foreground">{r.note.summary}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                    {truncate(r.snippet, 400)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </main>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}
