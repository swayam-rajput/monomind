"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-6">
        {/* Logo — left. A custom "memory constellation" glyph: five nodes
            connected by four segments that form an M. On hover the
            segments draw themselves left-to-right and the nodes bloom —
            a small orchestrated moment that says "knowledge graph"
            without spelling it out. */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-2 transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <span className="text-[11px] font-sans font-normal tracking-[0.2em] text-muted-foreground">
          Monome
          </span>
        </Link>

        {/* Desktop links — right, before the theme/burger group */}
        <div className="ml-auto relative hidden items-center gap-0.5 md:flex">
          {LINKS.map((link, i) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={link.href}
                className={cn(
                  "relative px-3 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 ease-out",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}


        </div>

        {/* Right group — theme toggle + mobile burger */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex md:hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={mobileOpen ? "close" : "menu"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex"
              >
                {mobileOpen ? (
                  <X className="size-4" />
                ) : (
                  <Menu className="size-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu — slides down under the bar */}
      <motion.div
        initial={false}
        animate={{
          height: mobileOpen ? "auto" : 0,
          opacity: mobileOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-0.5 border-t border-border bg-background/95 backdrop-blur-md px-6 py-3">
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
