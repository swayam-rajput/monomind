"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Wraps every route's content so navigating between pages animates instead of
 * snapping. Uses the page's pathname as the animation key so the exit plays
 * before the next route mounts.
 *
 * Kept deliberately cheap: a 250ms fade+slide, no staggered children, no
 * layout-shared elements - this is a whole-page transition, not a flourish.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}