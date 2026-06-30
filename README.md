# Goodspeed AI Knowledge Base

## Setup

**Requires:** Node 20+, pnpm 9+, a [Supabase](https://supabase.com) project, and an OpenAI-compatible API key.

```bash
pnpm install
pnpm setup    # copies .env.example → .env, syncs to apps/web + apps/api
```

Fill in `.env` at the repo root (see [`.env.example`](.env.example)), then run `pnpm setup` again to sync.

**Database:** apply both SQL files in `supabase/migrations/` in order via the Supabase SQL Editor (paste → Run):

1. [`20250629000000_init.sql`](supabase/migrations/20250629000000_init.sql)
2. [`20250630000000_summary_and_usage.sql`](supabase/migrations/20250630000000_summary_and_usage.sql)

Alternatively, set `DATABASE_URL` or `SUPABASE_DB_PASSWORD` in `.env` and run `pnpm db:migrate`.

**Run:**

```bash
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000  
- Health: http://localhost:4000/health  

Sign up in the app with email/password. If Supabase email confirmation is enabled, confirm via the link in your inbox, then sign in at `/login`.

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `AI_API_KEY`.

---

## Architecture decisions

```
apps/web (Next.js)  ──Bearer JWT──▶  apps/api (NestJS)  ──▶  Supabase (Auth + Postgres + pgvector)
                                              │
                                              └── packages/ai (OpenAI-compatible provider)
```

**Turborepo monorepo (Next.js + NestJS + shared packages)**  
Separates UI, API, and AI behind stable package boundaries. Shared Zod schemas in `packages/shared` keep request/response shapes consistent between frontend and backend.

**Supabase for auth and data; NestJS as the only mutation/AI path**  
The browser talks to Supabase only for login. Every document, chat, and upload goes through NestJS with the user's JWT. NestJS uses a request-scoped Supabase client so Postgres RLS still applies — defense in depth without duplicating auth logic in SQL policies alone.

**Provider-agnostic AI in `packages/ai`**  
Chat and embeddings sit behind one interface using the OpenAI-compatible HTTP shape. Swapping OpenAI, Groq, Ollama, etc. is an env change, which was a core requirement. Embeddings can use a separate endpoint (`AI_EMBEDDING_*`) when chat and embed models live on different hosts.

**Synchronous re-index on write**  
Create/update/delete triggers chunk → embed → pgvector insert in the request path. Simple and correct for assessment scale; a queue is the obvious next step at higher volume.

**RAG pipeline**  
- **Chunking:** heading-first splitter, ~2000 chars (~500 tokens), 250-char overlap — balances context per hit vs retrieval precision.  
- **Retrieval:** top-5 by cosine similarity with a low min score (0.2) as a garbage filter, not a tight relevance gate.  
- **Retrieval router:** one LLM call before embedding decides whether to search or skip (greetings/meta), and rewrites follow-ups (“tell me more about it”) into standalone dense-retrieval queries. Cheaper than always embedding; more reliable than keyword heuristics.

**Long conversations**  
Recent turns stay verbatim; older messages fold into a rolling per-conversation summary so context isn't dropped as threads grow. Summarization is best-effort — on failure the app falls back to the recent window only.

**Usage tracking**  
Each AI call (chat, embedding, router, summary) writes to `usage_events`. Streamed chat tokens are estimated when the provider doesn't return usage on the stream.

---

## Swap AI providers

No code changes — update `.env` and restart `pnpm dev`.

**Chat**

| Provider | `AI_BASE_URL` |
|----------|---------------|
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Together | `https://api.together.xyz/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Ollama (local) | `http://localhost:11434/v1` |

Set `AI_API_KEY` and `AI_CHAT_MODEL` to match the provider (`AI_API_KEY=ollama` for Ollama).

**Embeddings** (optional separate provider)

| Variable | Purpose |
|----------|---------|
| `AI_EMBEDDING_BASE_URL` | Embedding API base URL |
| `AI_EMBEDDING_API_KEY` | Embedding API key |
| `AI_EMBEDDING_MODEL` | e.g. `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | Must match pgvector column (default `1536`) |

Example — Ollama chat, OpenAI embeddings:

```bash
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_CHAT_MODEL=llama3.2
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-...
AI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
```

---

## Given more time

- **Async indexing (BullMQ)** — move embed/index off the HTTP request path for large uploads and bulk updates.  
- **Local JWT verification** — validate tokens with `SUPABASE_JWT_SECRET` instead of a Supabase `getUser` round-trip per request.  
- **Retrieval quality** — eval harness, optional reranking (cross-encoder on top-k), hybrid BM25 + vector search.  
- **Usage aggregation in SQL** — replace in-service rollups with a view/RPC as event volume grows.  
- **Broader file support** — DOCX/HTML ingestion, better PDF layout handling.

---

## Loom — app walkthrough

_App demo: signup, documents, upload, chat with streaming + citations, session history, usage._

**Link:** https://www.loom.com/share/5b14dd65934a4607aac3862423535b3a

---

## Loom — AI-accelerated development

_How the project was built with Cursor: spec-first planning, vertical slices._

**Link:** https://www.loom.com/share/ddab4ce018544ed68de0112ac6ae03fd
