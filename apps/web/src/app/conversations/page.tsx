import Link from "next/link";
import { prisma } from "@monome/db";

// Server component: reads directly from SQLite via Prisma at request time.
// No client-side fetching needed for a plain list like this.
export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <Link href="/import" className="text-sm font-medium underline">
          Import more
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing imported yet. Head to <Link href="/import" className="underline">/import</Link> to add some.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/conversations/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.source} &middot; {c.createdAt.toLocaleString()}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  {c._count.messages} message{c._count.messages === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
