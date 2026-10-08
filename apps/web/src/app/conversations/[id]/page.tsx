import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@monome/db";
import { ReEmbedButton } from "@/components/ReEmbedButton";
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

      <div className="divide-y divide-border/70">
        {/* Note */}
        <div className="py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Note</span>

              {!note && (
                <span className="text-xs text-muted-foreground">
                  Not generated
                </span>
              )}
            </div>

            {!note && (
              <GenerateNoteButton conversationId={conversation.id} />
            )}
          </div>

          {note?.summary && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {note.summary}
            </p>
          )}
        </div>

        {/* Embedding */}
        <div className="flex min-h-10 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Embedding</span>

            <span className="text-xs text-muted-foreground">
              {doneCount}/{totalChunks}
            </span>

            {failedCount > 0 && (
              <>
                <span className="text-xs text-destructive">
                  {failedCount} failed
                </span>

                <ReEmbedButton variant="outline" conversationId={conversation.id} />
              </>
            )}
          </div>

          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {totalChunks > 0
              ? `${Math.round((doneCount / totalChunks) * 100)}%`
              : "0%"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <MessagesSection messages={conversation.messages} />
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