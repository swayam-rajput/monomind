import Link from "next/link";
import { prisma } from "@monome/db";
import { BackfillNotesButton } from "@/components/BackfillNotesButton";
import { GenerateNoteButton } from "@/app/conversations/[id]/GenerateNoteButton";
import { DeleteConversationButton } from "@/app/conversations/[id]/DeleteConversationButton";
import { DeleteAllButton } from "./DeleteAllButton";

// Server component: reads directly from SQLite via Prisma at request time.
// No client-side fetching, no AI provider call - this page must always
// load regardless of whether Ollama or any BYOK provider is reachable.
export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      notes: true,
    },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <div className="flex items-center gap-2">
          {conversations.length > 0 && (
            <DeleteAllButton count={conversations.length} />
          )}
          <Link href="/import" className="text-sm font-medium text-link underline">
            Import more
          </Link>
        </div>
      </div>

      <BackfillNotesButton />

      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing imported yet. Head to <Link href="/import" className="text-link underline">/import</Link> to
          add some.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {conversations.map((c) => {
            const note = c.notes[0] ?? null;
            const topics: string[] = note ? JSON.parse(note.topics) : [];

            return (
              <li key={c.id} className="p-4 hover:bg-muted/30">
                <Link href={`/conversations/${c.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium leading-snug">{note?.titleOverride ?? c.title}</p>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {c._count.messages} msg{c._count.messages === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.source} &middot; {c.createdAt.toLocaleString()}
                  </p>

                  {note ? (
                    <>
                      <p className="mt-1.5 text-sm text-muted-foreground">{note.summary}</p>
                      {topics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {topics.map((t, i) => (
                            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">No note generated yet.</p>
                  )}
                </Link>

                {!note && (
                  <div className="mt-2 flex items-center gap-2">
                    <GenerateNoteButton conversationId={c.id} stopPropagation />
                    <DeleteConversationButton conversationId={c.id} stopPropagation size="sm" />
                  </div>
                )}
                {note && (
                  <div className="mt-2">
                    <DeleteConversationButton conversationId={c.id} stopPropagation size="sm" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
