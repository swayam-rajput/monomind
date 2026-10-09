# Monome

> A local-first knowledge base for your AI conversations.

Monome turns your AI conversation history into searchable, persistent knowledge. Import conversations, generate embeddings locally, search your history semantically, and ask questions against your past conversations with citation-backed answers.

## Why Monome?

AI conversations increasingly contain decisions, research, ideas, and working context. But that knowledge is usually trapped inside individual chat sessions.

Monome is built around a simple idea:

**Your AI conversations should compound instead of disappearing.**

## How it works

```text
AI Conversation Export
        ↓
    Import & Parse
        ↓
      SQLite
        ↓
   Chunk Conversations
        ↓
   Generate Embeddings
        ↓
      LanceDB
        ↓
   Semantic Retrieval
        ↓
    RAG + Ollama
        ↓
   Answer + Citations
```

### 1. Import

Import exported AI conversations and select which conversations you want to keep.

### 2. Process

Conversations are normalized and stored in SQLite. Long conversations are split into smaller chunks suitable for embedding.

### 3. Embed

Monome generates embeddings for the conversation chunks and stores them in LanceDB for semantic search.

### 4. Search and chat

Questions are embedded and compared against your conversation history. Relevant chunks are retrieved and passed to the language model as evidence.

The model is instructed to answer only from the retrieved evidence and cite the sources it uses.

### 5. Notes

Monome can generate structured notes from conversations, extracting summaries, topics, key ideas, decisions, and open questions.

## Features

- Import AI conversation exports
- Select conversations before importing
- Persistent conversation storage
- Local semantic search
- Conversation chunking for embeddings
- Embedding progress and failure recovery
- RAG-powered chat
- Citation-backed answers
- Direct links from citations to source conversations/messages
- Structured AI-generated notes
- Ollama support for local inference
- OpenAI BYOK support
- Configurable chat and embedding models
- Local-first architecture

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Database | SQLite |
| ORM | Prisma |
| Vector database | LanceDB |
| Local AI | Ollama |
| Alternative AI provider | OpenAI |
| Package structure | pnpm monorepo |

## Architecture

Monome separates structured application data from vector search data.

### SQLite / Prisma

SQLite is the source of truth for:

- Conversations
- Messages
- Notes
- Chat sessions
- Chat messages
- Application configuration

### LanceDB

LanceDB stores embedded conversation chunks and handles semantic similarity search.

The vector store is used for retrieval; relational data remains in SQLite.

### AI provider abstraction

AI operations are accessed through a provider interface rather than being tightly coupled to a single model provider.

This allows Monome to use local Ollama models while also supporting OpenAI.

## RAG pipeline

When a user asks a question:

```text
Question
   ↓
Generate query embedding
   ↓
LanceDB similarity search
   ↓
Apply relevance threshold
   ↓
Resolve conversations from SQLite
   ↓
Build evidence set
   ↓
Send grounded prompt to LLM
   ↓
Stream response
   ↓
Extract [N] citations
   ↓
Resolve citations to source messages
```

Citations are represented using deterministic indexes such as `[1]`, `[2]`, and `[3]`. The model never needs to generate database IDs or URLs itself.

## Local-first

Monome is designed around local storage and local inference.

With Ollama, conversation embeddings and model inference can run locally without sending conversation content to an external AI provider.

OpenAI can also be configured as a provider when external inference is preferred.

## Getting started

### Requirements

- Node.js
- pnpm
- SQLite
- Ollama, if using local inference

### Install

```bash
pnpm install
```

### Configure

Start Ollama if you're using the local provider:

```bash
ollama serve
```

Pull the models you want to use:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

Then start Monome:

```bash
pnpm dev
```

Open the application at:

```text
http://localhost:3000
```

## Project structure

```text
apps/
  web/

packages/
  ai/
  db/
  types/
```

The web application contains the UI and API routes, while the shared packages isolate AI/provider logic, database access, and shared types.

## Current limitations

Monome currently focuses on personal AI conversation memory.

It does not currently provide:

- Continuous synchronization with every AI provider
- Team collaboration and permissions
- Company-wide knowledge ontologies
- Agent execution traces across multiple coding/agent platforms
- MCP/CLI access to the knowledge base
- A feedback loop for automatically improving agent skills and workflows

These are deliberately outside the current scope.

## Status

Monome is an active portfolio project focused on the engineering problem of turning AI conversation history into persistent, searchable memory.

The core pipeline is:

**import → persist → embed → retrieve → generate → cite**

## License
