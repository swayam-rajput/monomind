import Link from "next/link";
import { prisma } from "@monome/db";
import { BackfillNotesButton } from "@/components/BackfillNotesButton";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <Link href="/import" className="text-sm font-medium text-[#0000ee] underline">
          Import more
        </Link>
      </div>

      <BackfillNotesButton />

      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing imported yet. Head to <Link href="/import" className="text-[#0000ee] underline">/import</Link> to
          add some.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {conversations.map((c) => {
            const note = c.notes[0] ?? null;
            const topics: string[] = note ? JSON.parse(note.topics) : [];

            return (
              <li key={c.id}>
                <Link href={`/conversations/${c.id}`} className="flex flex-col gap-2 p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{note?.titleOverride ?? c.title}</p>
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                      {c._count.messages} message{c._count.messages === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.source} &middot; {c.createdAt.toLocaleString()}
                  </p>

                  {note ? (
                    <>
                      <p className="text-sm text-muted-foreground">{note.summary}</p>
                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {topics.map((t, i) => (
                            <span key={i} className="rounded-pill bg-muted px-2 py-0.5 text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">No note generated yet.</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
