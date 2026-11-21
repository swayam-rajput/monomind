import Link from "next/link";
import { prisma } from "@monome/db";
import { parseNoteField } from "@/lib/notes/parseNoteFields";
import { getUserId } from "@/lib/get-user-id";

export default async function NotesPage() {
  const userId = await getUserId();
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { conversation: true },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Notes</h1>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">No notes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Notes are generated automatically after you{" "}
            <Link href="/import" className="text-link underline underline-offset-3">
              import
            </Link>{" "}
            a conversation.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {notes.map((note) => {
            const topics: string[] = parseNoteField(note.topics);
            return (
              <li key={note.id} className="p-4 transition-colors hover:bg-muted/30">
                <Link href={`/notes/${note.id}`} className="font-medium text-link underline underline-offset-3">
                  {note.titleOverride ?? note.conversation.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{note.summary}</p>
                {topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {topics.map((t, i) => (
                      <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <Link href={`/conversations/${note.conversationId}`} className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-3">
                  View source conversation →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
