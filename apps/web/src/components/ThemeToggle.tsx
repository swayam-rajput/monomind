"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

/** Simple light/dark toggle for the navbar. Reads resolvedTheme (not theme) so "system" shows the icon matching what's actually rendered. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the real theme after mount (it reads
  // localStorage/media query client-side) - render a stable placeholder
  // first to avoid a hydration mismatch between server and client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" disabled />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} strokeWidth={2} className="size-4" />
    </Button>
  );
}
