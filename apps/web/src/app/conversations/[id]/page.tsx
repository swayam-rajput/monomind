import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@monome/db";
import { RetryFailedChunksButton } from "./RetryFailedChunksButton";
import { GenerateNoteButton } from "./GenerateNoteButton";
import { DeleteConversationButton } from "./DeleteConversationButton";
import { MessagesSection } from "./MessagesSection";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      chunks: { orderBy: { order: "asc" } },
      notes: true,
    },
  });

  if (!conversation) notFound();

  const note = conversation.notes[0] ?? null;

  const topics: string[] = note ? JSON.parse(note.topics) : [];
  const keyIdeas: string[] = note ? JSON.parse(note.keyIdeas) : [];
  const decisions: string[] = note ? JSON.parse(note.decisions) : [];
  const openQuestions: string[] = note ? JSON.parse(note.openQuestions) : [];

  const totalChunks = conversation.chunks.length;
  const doneCount = conversation.chunks.filter(
    (chunk) => chunk.embeddingStatus === "done",
  ).length;
  const failedCount = conversation.chunks.filter(
    (chunk) => chunk.embeddingStatus === "failed",
  ).length;

  const isFullyEmbedded = totalChunks > 0 && doneCount === totalChunks;
  const isPartiallyEmbedded = doneCount > 0 && doneCount < totalChunks;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      {/* Back */}
      <Link
        href="/conversations"
        className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All conversations
      </Link>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex justify-between">

          <h1 className="text-xl font-semibold tracking-tight">
            {conversation.title}
          </h1>
          <p title="Permanently delete this conversation, its messages, note, and embedding records.">
              <DeleteConversationButton
                  conversationId={conversation.id}
                  redirectAfter
                />
            </p>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
            {conversation.source}
          </span>

          <span className="text-xs text-muted-foreground">
            {conversation.messages.length}{" "}
            {conversation.messages.length === 1 ? "message" : "messages"}
          </span>

          <span className="text-xs text-muted-foreground">
            ·
          </span>

          <span className="text-xs text-muted-foreground">
            {conversation.createdAt.toLocaleString()}
          </span>
        </div>

      </header>

      {/* Note */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Note</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A structured summary generated from this conversation.
          </p>
        </div>

        {note ? (
          <div className="space-y-6 px-6 py-5">
            {note.titleOverride && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Suggested title
                </p>
                <p className="text-sm font-medium">{note.titleOverride}</p>
              </div>
            )}

            <p className="text-sm leading-6 text-foreground/90">
              {note.summary}
            </p>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {keyIdeas.length > 0 && (
                <NoteList title="Key ideas" items={keyIdeas} />
              )}

              {decisions.length > 0 && (
                <NoteList title="Decisions" items={decisions} />
              )}

              {openQuestions.length > 0 && (
                <NoteList title="Open questions" items={openQuestions} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div>
              <p className="text-sm font-medium">No note generated yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a structured summary from this conversation.
              </p>
            </div>

            <GenerateNoteButton conversationId={conversation.id} />
          </div>
        )}
      </section>

      {/* Embedding status */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <h2 className="font-semibold">Embedding status</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalChunks} {totalChunks === 1 ? "chunk" : "chunks"} processed
            </p>
          </div>

          {isFullyEmbedded && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Complete
            </span>
          )}

          {isPartiallyEmbedded && failedCount === 0 && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              Processing
            </span>
          )}

          {failedCount > 0 && (
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              {failedCount} failed
            </span>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {doneCount} of {totalChunks} chunks embedded
            </span>

            {totalChunks > 0 && (
              <span className="font-medium">
                {Math.round((doneCount / totalChunks) * 100)}%
              </span>
            )}
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{
                width:
                  totalChunks > 0
                    ? `${(doneCount / totalChunks) * 100}%`
                    : "0%",
              }}
            />
          </div>

          {failedCount > 0 && (
            <div className="mt-4">
              <RetryFailedChunksButton
                conversationId={conversation.id}
              />
            </div>
          )}
        </div>
      </section>


      {/* Messages */}
      <section>
        <MessagesSection messages={conversation.messages} />
      </section>

    </main>
  );
}

function NoteList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>

      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="relative pl-4 text-sm leading-5 text-foreground/90"
          >
            <span className="absolute left-0 top-2 size-1.5 rounded-full bg-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}