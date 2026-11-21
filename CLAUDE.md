# Monomind — CLAUDE.md

## Project Overview

**Monomind** (formerly Monome) is a local-first AI conversation knowledge base — a personal portfolio project that turns exported AI conversations into searchable, persistent memory.

**Stack:** Next.js 14.2.35 (App Router, `src/` layout) + TypeScript + Tailwind CSS. SQLite via Prisma 5.20.0. LanceDB 0.37.1 for vector embeddings. Ollama is the zero-config default; OpenAI is supported as BYOK (Anthropic/Gemini are stubbed). npm monorepo (`apps/web`, `packages/ai`, `packages/db`, `packages/types`) driven by turbo 2.1.3.

**Pipeline:** import (ChatGPT export zip or pasted JSON) → persist to SQLite → chunk (~500 tokens, message-boundary respecting) → embed → LanceDB → semantic search / RAG chat with `[N]` citations → notes (summary, topics, keyIdeas, decisions, openQuestions).

## Commands

```bash
# Install
pnpm install

# Development (starts all apps via turbo)
pnpm dev
# → http://localhost:3000

# Build
pnpm run build

# Lint
pnpm run lint
```

## Directory Structure

```
S:\Programming\monome\
├── apps/
│   └── web/                 # Next.js app (all routes, UI, API)
├── packages/
│   ├── ai/                  # AI providers, prompts, config
│   ├── db/                  # Prisma schema, LanceDB, SQLite
│   └── types/               # Shared TypeScript types
├── package.json             # Root workspace config
├── turbo.json               # Turbo build pipeline
└── README.md
```

## Key Files

| File | Purpose |
|---|---|
| `apps/web/src/app/page.tsx` | Marketing home page |
| `apps/web/src/app/chat/page.tsx` | RAG chat with streaming + citations |
| `apps/web/src/app/api/chat/route.ts` | Retrieval + streaming endpoint |
| `apps/web/src/app/import/page.tsx` | Import UI (ChatSelectionDialog) |
| `packages/db/prisma/schema.prisma` | Source of truth (Conversation, Message, Chunk, Note, ContextDocument, etc.) |
| `packages/db/src/lancedb.ts` | Vector store (one table per embedding model) |
| `packages/ai/src/providers/ollama.ts` | Ollama HTTP client |
| `packages/ai/src/notes.ts` | Note generation prompt + validation |
| `packages/ai/src/ragPrompt.ts` | RAG prompt + citation extraction |
| `packages/ai/src/config.ts` | User config at `~/.monomind/config.json` |

## Known Quirks

1. **`packages/db/.env`** holds `DATABASE_URL="file:./dev.db"` (relative path — works when run from that package dir). Gitignored. `packages/db/.env.example` exists as a first-run guide.

2. **LanceDB `delete()`** has no parameterized API — only accepts a predicate string. `lancedb.ts` guards with `SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/` before interpolation.

3. **Tailwind silently drops unknown colors** — `border-grey-300` compiles to zero CSS. Use `border-border` (CSS variable token).

4. **JSX ternary string literals split across lines** are a syntax error. Keep ternaries on one line inside JSX.

5. **`next/font/google`** self-hosts fonts into `.next/public/` (build needs network, runtime is offline).

6. **DialogPanel scrolling** needs `min-h-0 flex-1` on the ScrollArea so it participates in the flex layout and caps at the popup's `max-h`.

7. **Unsafe `JSON.parse` on note fields** — created `parseNoteField()` that falls back to `[]`.

8. **Config path** — user settings live at `~/.monomind/config.json` (outside the repo, never committed).

## UI System

- **Design tokens** in `apps/web/src/app/globals.css` (CSS variables following shadcn/ui convention)
- **Fonts**: DM Sans (body), Aboreto (logo/headlines), Geist Mono (code)
- **Border radius**: `--radius: 0.625rem` (10px), `--radius-sm: 0.375rem` (6px)
- **Page transitions**: `apps/web/src/app/template.tsx` wraps routes in `PageTransition` (250ms fade+slide)
- **Navbar**: awwards-style — logo left, links right, sliding underline active indicator, mobile hamburger with slide-down menu
- **Logo**: custom "memory constellation" SVG glyph (`LogoMark` in `NavBar.tsx`) — 5 nodes + 4 segments forming an M, draws left-to-right on hover, nodes bloom

## Workflow Rules (from user)

1. **Git commit policy**: Never run `git commit` unless explicitly asked. Never push without permission. Don't rewrite history. Show diff and wait for approval.

2. **Build rule**: Do NOT run `npm run build` unless explicitly asked. Builds are ~30s and block the turn.

3. **Memory**: Project context persists in `C:\Users\simon\.claude\projects\S--Programming-monome\memory\monome-session.md`

## Current State (as of 2026-11-21)

- **Branch**: `master`
- **Last commit**: `5dc575f` (UI fixes)
- **Uncommitted**: rename Monome → Monomind (47 files), plus navbar/transition work
- **Config types**: `MonomeConfig` in `@monome/ai` (internal package scope kept as `@monome/...`)

## Recently Fixed (this session)

1. Removed stray `console.log` in citation button
2. Added `SAFE_ID_RE` guard in LanceDB `upsertChunkVector`
3. Created `parseNoteField()` + replaced unsafe `JSON.parse` in 4 pages
4. Added `packages/db/.env.example`
5. Removed duplicate empty-response check in `OllamaProvider.post()`
6. Fixed `border-grey-300` → `border-border` in Settings
7. Removed dead `Alef` font import + CSS token
8. Fixed malformed class string in `MessagesSection.tsx`
9. Added drag-over feedback + `.zip` validation to Import page
10. Chat page redesign: empty state, suggestion chips, typing-dots indicator, pill citations
11. ChatSelectionDialog: fixed scrolling, improved row layout
12. Page transitions moved to `template.tsx`
13. Navbar: awwards-style with sliding underline + memory constellation logo
14. Color token refinement: tighter borders, global 150ms transitions
15. Rename: Monome → Monomind across all docs/code (internal `@monome/*` scopes preserved)

## Challenges Document

Non-obvious gotchas and reasoning behind fixes are documented in `challenges.md` — 7 items covering Tailwind color drops, JSX ternary pitfalls, LanceDB unparameterized delete, dead font imports, DialogPanel height contract, unsafe note parsing, missing DATABASE_URL, and commit workflow rule.

---

When working here: use absolute paths, prefer `pnpm` over `npm`, respect the build rule, and treat `node_modules`, `.next`, `.turbo`, `.env`, `dev.db`, `data/lancedb/` as gitignored build artifacts.