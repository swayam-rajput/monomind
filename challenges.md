# Challenges

Hard-won notes from building and fixing Monomind. Most of these bit silently —
nothing crashed, but the result was wrong, and the only way to catch it was to
check the compiled output or run the build.

## Tailwind silently drops unknown color names

`border-grey-300` compiles to **zero CSS**. Tailwind does not warn about
unknown colors; it just emits nothing. The Settings page's selected-provider
button therefore had no border at all, and it looked broken.

**Lesson:** when a utility class appears to do nothing, grep the compiled CSS
(`.next/static/css/app/*.css`) rather than trusting the class name. The token
system uses `--border` / `border-border`, not arbitrary grey names.

## JSX ternary string literals split across lines

A JSX expression like

```jsx
{conversationCount === 1 ? "imported conversation" : "imported
  conversations"}
```

is a syntax error — a raw newline inside a string literal. The editor did not
catch it; only `npm run build` did, with a misleading "Syntax Error" pointing at
the line *after* the expression.

**Lesson:** keep ternaries and string literals on one line inside JSX. When
wrapping text across lines in JSX, break the * JSX structure*, not the string —
use `{" "}` fragments and separate `<span>` elements instead.

## LanceDB `delete()` has no parameterized API

`lancedb.ts` interpolates `row.id` directly into a predicate string:

```js
table.delete(`id = '${row.id}'`)
```

LanceDB 0.37.1's `delete()` only accepts a predicate string — there is no
bound-parameter API — so an untrusted id could inject into the predicate.

**Fix:** assert `SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/` before interpolation. Cheap,
and it is the only shape an id can legitimately take.

## Dead font imports are invisible

`layout.tsx` imported `Alef` from `next/font/google` and `globals.css` declared
`--font-alef` and a `.font-alef` utility, but nothing in the app used them.
The import also forced a network fetch at build time, fighting the app's
offline-first goal.

**Fix:** remove the import, the CSS token (both light and dark blocks), and the
utility class. `next/font/google` self-hosts fonts into `.next/public/`, so a
build needs network — runtime is offline, build is not.

## DialogPanel scrolling needs an explicit height contract

`DialogPanel` wraps its children in a `ScrollArea` with no height constraint.
A `ScrollArea` with `size-full` children and no capped parent grows to fit its
content instead of scrolling, so a long conversation list pushed the dialog
past the viewport with no scrollbar.

**Fix:** give the `ScrollArea` `min-h-0 flex-1` so it participates in the
dialog's flex layout and caps at the popup's `max-h`. `min-h-0` is the
non-obvious half — flex children overflow their content by default.

## Unsafe `JSON.parse` on note fields

Note fields (`topics`, `keyIdeas`, `decisions`, `openQuestions`) are stored as
JSON-encoded strings. A malformed row 500'd the whole conversations / notes
page.

**Fix:** `parseNoteField(raw)` falls back to `[]` on malformed JSON. Applied in
four page components.

## Prisma needs `DATABASE_URL` on a fresh clone

`packages/db/.env` holds `DATABASE_URL="file:./dev.db"` and is gitignored, so a
fresh clone had no value and `prisma generate` / `prisma migrate` failed.
Added `packages/db/.env.example` as a first-run guide.

## Workflow: committing on sight vs. reviewing first

Early in the session I committed freely. The user later asked that, on commit
requests, I only produce the message and let them review and commit. That rule
takes effect from commit `716d0bd` onward — the earlier commits were already
on the record and are not being re-litigated.
