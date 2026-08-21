import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Monome</h1>
      <p className="text-muted-foreground">Your local-first second brain.</p>
      <p className="text-sm text-muted-foreground">
        Start by <Link href="/import" className="underline">importing</Link> a ChatGPT export, then explore your{" "}
        <Link href="/conversations" className="underline">conversations</Link>,{" "}
        <Link href="/notes" className="underline">notes</Link>, or{" "}
        <Link href="/search" className="underline">search</Link> and{" "}
        <Link href="/chat" className="underline">chat</Link> with them.
      </p>
    </main>
  );
}
