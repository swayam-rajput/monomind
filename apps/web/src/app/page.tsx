"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-background">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-250px] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute right-[-200px] top-[35%] h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
        {/* Hero */}
        <section className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
          <div className="w-full max-w-2xl text-center">

            <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Your conversations,
              <br />
              <span className="text-muted-foreground">
                remembered.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-muted-foreground">
              A local-first knowledge base for your AI conversations.
              Search your history, recover past thinking, and turn
              conversations into structured knowledge.
            </p>

            <div className="mt-9 flex items-center justify-center gap-3">
              <Link
                href="/import"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md"
              >
                Import conversations
              </Link>

              <Link
                href="/chat"
                className="rounded-lg border border-border bg-background/60 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted"
              >
                Ask your memory
              </Link>
            </div>

            <p className="mt-8 text-xs text-muted-foreground/70">
              Local-first · Private · Built for your history
            </p>
          </div>
        </section>

        {/* Why Monome */}
        <section className="border-t border-border py-28">
          <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Why Monome?
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Your AI conversations shouldn&apos;t disappear.
              </h2>
            </div>

            <div className="space-y-5 text-sm leading-7 text-muted-foreground">
              <p>
                AI conversations often contain decisions, ideas, research,
                explanations, and solutions that are useful long after the
                conversation ends.
              </p>

              <p>
                But that knowledge is scattered across chat histories and
                difficult to find again. Searching through old conversations
                manually doesn&apos;t scale.
              </p>

              <p>
                Monome turns those conversations into a searchable personal
                knowledge base that you can query when you need it.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              From conversations to memory.
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Monome processes your conversation history locally and makes it
              available for semantic search and grounded questions.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
            <Step
              number="01"
              title="Import"
              description="Import your exported AI conversations into Monome."
            />

            <Step
              number="02"
              title="Process"
              description="Conversations are stored, chunked, and embedded for semantic retrieval."
            />

            <Step
              number="03"
              title="Ask"
              description="Search your history or ask questions about what you've discussed."
            />

            <Step
              number="04"
              title="Remember"
              description="Generate structured notes containing summaries, ideas, decisions, and open questions."
            />
          </div>
        </section>

        {/* Privacy / architecture */}
        <section className="border-t border-border py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Local-first by design
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Your knowledge stays with you.
            </h2>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Monome uses local storage, local embeddings, and local language
              models to build your knowledge base without requiring your
              conversation history to be sent to a hosted AI service.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-28 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Start building your memory.
          </h2>

          <p className="mt-4 text-sm text-muted-foreground">
            Import your conversation history and see what you&apos;ve already
            learned.
          </p>

          <Link
            href="/import"
            className="mt-7 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Import conversations
          </Link>
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          Local-first · Your data stays on your machine.
        </footer>
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background p-6">
      <span className="text-xs font-medium text-muted-foreground">
        {number}
      </span>

      <h3 className="mt-8 text-sm font-semibold">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
