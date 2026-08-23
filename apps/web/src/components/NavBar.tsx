"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/import", label: "Import" },
  { href: "/conversations", label: "Conversations" },
  { href: "/notes", label: "Notes" },
  { href: "/search", label: "Search" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
];

// nav-bar: canvas background, ink text, body-md-strong link labels,
// {spacing.lg} {spacing.3xl} padding - per DESIGN-uber.md.
export function NavBar() {
  const pathname = usePathname();

  return (
    // Fixed height (h-14 = 3.5rem) so layout.tsx's <main> can reserve
    // exactly this much space with pt-14 - if you change this height,
    // update the matching pt-14/h-[calc(100vh-3.5rem)] in layout.tsx too.
    <nav className="fixed w-full top-0 z-40 flex h-10 flex justify-center items-center border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-1 overflow-x-auto px-8">
        <div>
          <Link href="/" className="mr-16 text-lg font-bold text-foreground">
            Monome
          </Link>
        </div>
        <div className="flex items-center">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
