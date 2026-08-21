"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SearchApiResult } from "@/app/api/search/route";

type Status = "idle" | "checking" | "empty-db" | "searching" | "done" | "error";

export default function SearchPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchApiResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check once on load whether there's anything to search at all, so we
    // can show a clear "import something first" message instead of an
    // empty results list that looks like "no matches for your query."
    fetch("/api/conversations/count")
      .then((r) => r.json())
      .then((body: { count: number }) => {
        setStatus(body.count === 0 ? "empty-db" : "idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus("searching");
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Search failed.");
        setStatus("error");
        return;
      }

      setResults(body.results as SearchApiResult[]);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setStatus("error");
    }
  }

  if (status === "checking") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (status === "empty-db") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted-foreground">
          Nothing imported yet.{" "}
          <Link href="/import" className="underline">
            Import something first
          </Link>{" "}
          before you can search.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your conversations..."
          className="flex-1 rounded border border-border bg-background p-2 text-sm"
        />
        <button
          type="submit"
          disabled={status === "searching"}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === "searching" ? "Searching..." : "Search"}
        </button>
      </form>

      {status === "searching" && (
        <p className="text-sm text-muted-foreground">
          Embedding your query and searching&hellip; this calls the active AI provider, so it can take a moment,
          especially on local Ollama.
        </p>
      )}

      {status === "error" && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "done" && results && (
        <>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches found for that query.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {results.map((r) => (
                <li key={r.chunkId} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/conversations/${r.conversationId}`} className="font-medium underline">
                        {r.note?.titleOverride ?? r.conversationTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.conversationCreatedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      similarity {(1 - r.distance).toFixed(3)}
                    </span>
                  </div>

                  {r.note && <p className="mt-2 text-sm text-muted-foreground">{r.note.summary}</p>}

                  <p className="mt-2 whitespace-pre-wrap text-sm">{truncate(r.snippet, 400)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}
