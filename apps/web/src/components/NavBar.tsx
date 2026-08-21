"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/import", label: "Import" },
  { href: "/conversations", label: "Conversations" },
  { href: "/notes", label: "Notes" },
  { href: "/search", label: "Search" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
        <Link href="/" className="mr-4 font-semibold">
          Monome
        </Link>
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded px-3 py-1.5 text-sm font-medium bg-muted"
                  : "rounded px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
