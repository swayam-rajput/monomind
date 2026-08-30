import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100dvh-2.5rem)] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">Monome</h1>
      <p className="text-muted-foreground">Your local-first second brain.</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Start by <Link href="/import" className="text-link underline">importing</Link> a ChatGPT export, then
        explore your <Link href="/conversations" className="text-link underline">conversations</Link>,{" "}
        <Link href="/notes" className="text-link underline">notes</Link>, or{" "}
        <Link href="/search" className="text-link underline">search</Link> and{" "}
        <Link href="/chat" className="text-link underline">chat</Link> with them.
      </p>
    </main>
  );
}
