import Link from "next/link";
import { prisma } from "@monome/db";

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    include: { conversation: true },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Notes</h1>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Notes are generated automatically after you{" "}
          <Link href="/import" className="text-[#0000ee] underline">
            import
          </Link>{" "}
          a conversation.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {notes.map((note) => {
            const topics: string[] = JSON.parse(note.topics);
            return (
              <li key={note.id} className="p-4">
                <Link href={`/notes/${note.id}`} className="font-medium text-[#0000ee] underline">
                  {note.titleOverride ?? note.conversation.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{note.summary}</p>
                {topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {topics.map((t, i) => (
                      <span key={i} className="rounded-pill bg-muted px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/conversations/${note.conversationId}`}
                  className="mt-2 inline-block text-xs text-muted-foreground underline"
                >
                  View source conversation &rarr;
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
