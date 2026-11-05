import { ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";

/**
 * template.tsx re-renders on every route change (unlike layout.tsx,
 * which persists), so it is the right place to own page-transition
 * animation. Keeping it here means the animation concern is isolated
 * from the shared shell (nav + theme provider) that never changes.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}