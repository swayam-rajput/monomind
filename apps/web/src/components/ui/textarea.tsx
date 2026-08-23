import * as React from "react"

import { cn } from "@/lib/utils"

// forwardRef is required: without it, a `ref` passed to <Textarea> (e.g.
// /chat's auto-grow effect, which reads/sets .style.height directly)
// silently attaches to nothing and ref.current stays null forever.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // min-h-16 (64px) + field-sizing-content (native CSS auto-grow)
          // was double-driving height alongside /chat's own manual resize
          // effect, and set a tall floor even for an empty single line.
          // Callers that need auto-grow behavior (like /chat) should pass
          // their own min-h-*/field-sizing override via className.
          "flex min-h-9 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea }
