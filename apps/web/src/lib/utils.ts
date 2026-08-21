import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (later classes win).
 * Standard shadcn/ui helper used by every generated component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
