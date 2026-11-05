import { notFound } from "next/navigation";
import { prisma } from "@monome/db";
import { parseNoteField } from "@/lib/notes/parseNoteFields";
import { NoteEditor } from "./NoteEditor";

export default async function NoteDetailPage({ params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: { conversation: true },
  });

  if (!note) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <NoteEditor
        note={{
          id: note.id,
          conversationId: note.conversationId,
          conversationTitle: note.conversation.title,
          titleOverride: note.titleOverride,
          summary: note.summary,
          topics: parseNoteField(note.topics),
          keyIdeas: parseNoteField(note.keyIdeas),
          decisions: parseNoteField(note.decisions),
          openQuestions: parseNoteField(note.openQuestions),
        }}
      />
    </main>
  );
}
