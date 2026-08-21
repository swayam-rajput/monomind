# Monome

A local-first personal knowledge base that turns your AI chat history
(ChatGPT exports) into a searchable, queryable second brain. Everything
runs on your own machine — no cloud services, no hosting costs, no
accounts.

## Prerequisites

- **Node.js 20+** (tested on 22)
- **Ollama** (for the default "Local" mode) — install from
  [ollama.com](https://ollama.com), then pull the two models Monome uses:


  ```
  ollama pull nomic-embed-text
  ollama pull llama3.1:8b
  ```

  `nomic-embed-text` is used for embeddings (small, fast). `llama3.1:8b`
  is used for chat/summarization — it's a ~4.9GB model, so make sure your
  machine has enough free RAM/VRAM to load it. If it's too heavy for your
  hardware, you can swap the default in `packages/ai/src/providers/ollama.ts`
  for a lighter model you already have pulled (e.g. `mistral`,
  `qwen2.5-coder`).

  Ollama must be running (`ollama serve`, or just have the Ollama app open)
  before you use Monome. If it's not running, Monome will tell you clearly
  instead of crashing.

- Alternatively, skip Ollama entirely and use **BYOK (OpenAI)** mode
  instead — see Settings below. No local models required in that case,
  but it does send your conversation text to OpenAI's API.

## Setup

```
npm install
```

This installs dependencies for the whole monorepo (the Next.js app plus
the shared `@monome/ai`, `@monome/db`, `@monome/types` packages) and runs
Prisma's client generation automatically via the workspace install.

The SQLite database is created automatically on first run at
`packages/db/prisma/dev.db`. If you ever need to (re)apply migrations by
hand:

```
cd packages/db
npx prisma migrate dev
```

## Running

```
npm run dev
```

Opens the Next.js app at [http://localhost:3000](http://localhost:3000).
Everything - the web app, SQLite, and LanceDB (embedded vector storage
under `data/lancedb/`) - runs in this one process. No separate servers.

## Pages

- **Import** (`/import`) — upload a ChatGPT export `.zip` (Settings →
  Data controls → Export data on chatgpt.com) or paste a single
  conversation as JSON for quick testing. After import, the app
  automatically chunks and embeds each conversation, then generates a
  structured note (summary, topics, key ideas) for it — you'll see
  progress bars for each step.
- **Conversations** (`/conversations`) — browse everything you've
  imported. Click into one to see its messages, its generated note, and
  the embedding status of each chunk (with a retry button if any failed).
- **Notes** (`/notes`) — browse AI-generated notes. Click into one to
  edit its summary/topics/ideas by hand (edits never trigger AI
  regeneration automatically), or hit "Regenerate from source" if you
  want a fresh AI-generated version instead.
- **Search** (`/search`) — semantic search across every chunk you've
  embedded. Ranked by cosine similarity, with snippets and links back to
  the source conversation.
- **Chat** (`/chat`) — ask questions answered only from your imported
  data. Retrieves relevant evidence first, then asks the chat model to
  answer using only that evidence, with numbered citations linking back
  to source conversations. Says so explicitly if nothing relevant is
  found, rather than guessing from general knowledge.
- **Settings** (`/settings`) — switch between Local (Ollama) and BYOK
  (OpenAI) mode. This choice (and any API key) is stored in
  `~/.monome/config.json` on your machine, never in the app's database,
  and never sent anywhere except directly to the provider you choose. A
  "Test connection" button lets you confirm the active provider is
  actually reachable.

## Project structure

```
apps/web              Next.js 14 app (App Router) - all pages and API routes
packages/ai            Provider-agnostic AI interface (Ollama + OpenAI BYOK),
                        rate limiting, RAG/notes prompt building
packages/db             Prisma client (SQLite) + LanceDB wrapper + chunking logic
packages/types           Shared TypeScript types used across the monorepo
```

## Notes on scope

This is a v0 / portfolio project, not a production app. Known
limitations: ChatGPT exports only (no Claude import yet), no memory
consolidation/deduplication across notes, no contradiction detection, no
authentication (it's a single-user local app), Anthropic/Gemini BYOK
providers are stubbed but not implemented.
