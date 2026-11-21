"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  FileDown,
  Database,
  Search,
  Brain,
  FileText,
  Sparkles,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    number: "01",
    icon: FileDown,
    title: "Import",
    description: "Drop a ChatGPT export (.zip) or paste a conversation. We parse and normalize it.",
    color: "from-blue-500 to-blue-600",
  },
  {
    number: "02",
    icon: Database,
    title: "Store",
    description: "Conversations persist in PostgreSQL. Messages stay intact for citation traceability.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    number: "03",
    icon: Search,
    title: "Embed",
    description: "Chunks (~500 tokens) are embedded locally via Ollama and indexed in LanceDB for semantic search.",
    color: "from-amber-500 to-amber-600",
  },
  {
    number: "04",
    icon: Brain,
    title: "Retrieve",
    description: "Your question is embedded, matched against chunks, and relevant evidence is surfaced.",
    color: "from-violet-500 to-violet-600",
  },
  {
    number: "05",
    icon: Sparkles,
    title: "Answer",
    description: "The LLM answers using only retrieved evidence, with [N] citations linking back to source messages.",
    color: "from-rose-500 to-rose-600",
  },
  {
    number: "06",
    icon: FileText,
    title: "Remember",
    description: "Structured notes auto-generated: summary, topics, decisions, open questions — editable and exportable.",
    color: "from-indigo-500 to-indigo-600",
  },
];

const ICON_SIZE = 24;

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-250px] h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute right-[-200px] top-[35%] h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
        {/* Hero */}
        <section className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Your conversations,
                <br />
                <span className="text-muted-foreground">remembered.</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="mx-auto mt-6 max-w-md text-sm leading-6 text-muted-foreground"
            >
              A local-first knowledge base for your AI conversations.
              Search your history, recover past thinking, and turn
              conversations into structured knowledge.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="mt-9 flex items-center justify-center gap-3"
            >
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
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 text-xs text-muted-foreground/70"
            >
              Local-first · Private · Built for your history
            </motion.p>
          </div>
        </section>

        {/* Pipeline visualization */}
        <section className="border-t border-border py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl mx-auto text-center"
          >
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From conversations to memory.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground max-w-lg mx-auto">
              Monomind processes your conversation history locally and makes it
              available for semantic search and grounded questions.
            </p>
          </motion.div>

          {/* Pipeline flow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="mt-16 relative"
          >
            {/* Connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent -translate-x-1/2 hidden md:block" />

            <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:grid-rows-3 gap-8">
              {PIPELINE_STEPS.map((step, index) => (
                <PipelineStep
                  key={step.number}
                  step={step}
                  index={index}
                  isLast={index === PIPELINE_STEPS.length - 1}
                />
              ))}
            </div>
          </motion.div>
        </section>

        {/* Privacy / architecture */}
        <section className="border-t border-border py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Local-first by design
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your knowledge stays with you.
            </h2>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Monomind uses local storage, local embeddings, and local language
              models to build your knowledge base without requiring your
              conversation history to be sent to a hosted AI service.
            </p>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-28 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-semibold tracking-tight"
          >
            Start building your memory.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            Import your conversation history and see what you&apos;ve already
            learned.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mt-7"
          >
            <Link
              href="/import"
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Import conversations
            </Link>
          </motion.div>
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          Local-first · Your data stays on your machine.
        </footer>
      </div>
    </main>
  );
}

function PipelineStep({
  step,
  index,
  isLast,
}: {
  step: typeof PIPELINE_STEPS[0];
  index: number;
  isLast: boolean;
}) {
  const Icon = step.icon;
  const delay = index * 0.08;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className="relative flex flex-col items-center md:flex-row md:items-start gap-4 p-6 bg-background/50 rounded-2xl border border-border/50"
    >
      {/* Number + Icon */}
      <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br" style={{ background: step.color }}>
        <Icon className="text-white" size={ICON_SIZE} />
      </div>

      {/* Connecting dot for non-last items */}
      {!isLast && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-muted-foreground/30 hidden md:block"
        />
      )}

      {/* Content */}
      <div className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {step.number}
          </span>
          <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}