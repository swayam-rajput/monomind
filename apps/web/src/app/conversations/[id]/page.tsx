import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@monome/db";
import { RetryFailedChunksButton } from "./RetryFailedChunksButton";
import { GenerateNoteButton } from "./GenerateNoteButton";

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
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

  const failedCount = conversation.chunks.filter((c) => c.embeddingStatus === "failed").length;
  const doneCount = conversation.chunks.filter((c) => c.embeddingStatus === "done").length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Link href="/conversations" className="text-sm text-muted-foreground underline">
        &larr; All conversations
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{conversation.title}</h1>
        <p className="text-sm text-muted-foreground">
          {conversation.source} &middot; {conversation.createdAt.toLocaleString()} &middot; {conversation.messages.length}{" "}
          messages
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium">Note</h2>
        {note ? (
          <div className="mt-2 flex flex-col gap-3 text-sm">
            {note.titleOverride && (
              <p>
                <span className="font-medium">Suggested title:</span> {note.titleOverride}
              </p>
            )}
            <p>{note.summary}</p>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topics.map((t, i) => (
                  <span key={i} className="rounded-pill bg-muted px-2 py-0.5 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {keyIdeas.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Key ideas</p>
                <ul className="mt-1 list-inside list-disc">
                  {keyIdeas.map((idea, i) => (
                    <li key={i}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}

            {decisions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Decisions</p>
                <ul className="mt-1 list-inside list-disc">
                  {decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {openQuestions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Open questions</p>
                <ul className="mt-1 list-inside list-disc">
                  {openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">No note generated yet.</p>
            <GenerateNoteButton conversationId={conversation.id} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium">Embedding status</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {conversation.chunks.length} chunk{conversation.chunks.length === 1 ? "" : "s"} &middot; {doneCount} done
          {failedCount > 0 && ` · ${failedCount} failed`}
        </p>

        {failedCount > 0 && <RetryFailedChunksButton conversationId={conversation.id} />}

        {conversation.chunks.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 text-xs">
            {conversation.chunks.map((chunk) => (
              <li key={chunk.id} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    chunk #{chunk.order} &middot; ~{chunk.tokenEstimate} tokens
                  </span>
                  <span
                    className={
                      chunk.embeddingStatus === "done"
                        ? "text-green-600"
                        : chunk.embeddingStatus === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {chunk.embeddingStatus}
                  </span>
                </div>
                {chunk.error && <p className="mt-1 text-destructive">{chunk.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Messages</h2>
        {conversation.messages.map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{m.role}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
