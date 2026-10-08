"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { Alef, Questrial, Oxanium } from 'next/font/google';
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
    <nav className="fixed inset-x-0 top-0 z-40 h-10 border-b border-border bg-background">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center px-6">
        {/* Logo */}
        <div className="group relative h-5 overflow-hidden">
          <div className="transition-transform duration-300 group-hover:-translate-y-5">
            <Link
              href="/"
              className="flex h-5 items-center text-lg font-alef tracking-tight text-foreground"
            >
              Monome
            </Link>

            <Link
              href="/"
              className="flex h-5 items-center text-lg font-alef tracking-tight text-foreground"
            >
              Monome
            </Link>
          </div>
        </div>

        <div className="mx-auto flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex h-7 items-center whitespace-nowrap rounded-full px-3",
                  "text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Theme */}
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </nav >
  );
}