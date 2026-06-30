# Goodspeed AI Knowledge Base

## Setup

### Prerequisites

- **Node.js 20+**
- **pnpm 9+** — this repo pins `pnpm@9.15.9` via `packageManager`. If pnpm is missing:

  ```bash
  corepack enable
  corepack prepare pnpm@9.15.9 --activate
  ```

- A [Supabase](https://supabase.com) project (free tier is fine)
- An **OpenAI-compatible API key** (OpenAI, Groq, OpenRouter, Ollama, etc.)

### Quick start

```bash
pnpm install
pnpm setup          # copies .env.example → .env, syncs to apps/web + apps/api
# Fill in .env (see Environment variables below), then:
pnpm setup          # re-sync after editing .env
pnpm db:migrate     # or paste SQL in Supabase SQL Editor (see Database)
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

Open http://localhost:3000 → **Sign up** → create a document → try **Chat**.

---

### Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Email** auth: **Authentication → Providers → Email** (enabled by default).
3. Configure local URLs — **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/**`
4. Copy credentials from **Project Settings → API** into `.env` (see table below).

**Email confirmation (optional for local dev):**  
If **Confirm email** is enabled, sign up → click the link in your inbox → sign in at `/login`.  
For the fastest local smoke test, disable **Confirm email** under **Authentication → Providers → Email** — then signup logs you in immediately.

---

### Environment variables

Edit `.env` at the repo root ([`.env.example`](.env.example) is the template).  
`pnpm setup` copies it to `apps/web/.env.local` and `apps/api/.env` — **always re-run `pnpm setup` after changing `.env`.**

#### Required (app won't work without these)

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API → anon public** |
| `AI_API_KEY` | Your AI provider (OpenAI dashboard, Groq, etc.; use `ollama` for local Ollama) |

#### Optional (defaults work for local dev)

| Variable | Purpose |
|----------|---------|
| `AI_BASE_URL` | Chat API base URL (default: OpenAI) |
| `AI_CHAT_MODEL` | Chat model (default: `gpt-4o-mini`) |
| `AI_EMBEDDING_*` | Separate embedding provider if chat and embed differ |
| `EMBEDDING_DIMENSION` | Vector width (default: `1536`) — must match your embedding model |
| `API_PORT` / `CORS_ORIGIN` / `NEXT_PUBLIC_API_URL` | API binding (defaults: `4000`, `http://localhost:3000`, `http://localhost:4000`) |

#### Optional (scripts / verification only — not needed to run the app)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API → service_role** — used by `pnpm db:migrate` (schema detection) and `pnpm db:verify-usage` |
| `SUPABASE_JWT_SECRET` | Supabase → **Project Settings → API → JWT Secret** — used only by `pnpm db:verify-usage` |
| `DATABASE_URL` or `SUPABASE_DB_PASSWORD` | Postgres connection for `pnpm db:migrate` (see Database below) |
| `SUPABASE_DB_HOST` | Pooler hostname if `pnpm db:migrate` fails — copy from Supabase → **Project Settings → Database → Connection string** (Session pooler). Default script assumes `aws-0-us-east-1.pooler.supabase.com`; your region may differ. |

---

### Database

Apply both migrations **in order**. The app needs pgvector, RLS policies, and the `match_document_chunks` RPC.

#### Option A — Supabase SQL Editor (simplest)

Dashboard → **SQL Editor** → New query → paste each file → **Run**:

1. [`20250629000000_init.sql`](supabase/migrations/20250629000000_init.sql)
2. [`20250630000000_summary_and_usage.sql`](supabase/migrations/20250630000000_summary_and_usage.sql)

SQL Editor paste uses embedding dimension **1536** by default (matches OpenAI `text-embedding-3-small`).

#### Option B — CLI migrate

Add to `.env`:

```bash
# Either the full URI from Supabase → Database → Connection string:
DATABASE_URL=postgresql://postgres.[ref]:[password]@[host]:6543/postgres

# Or just the database password (script builds the pooler URI from NEXT_PUBLIC_SUPABASE_URL):
SUPABASE_DB_PASSWORD=your-db-password
# If connection fails, also set SUPABASE_DB_HOST from your project's connection string.
```

Then:

```bash
pnpm db:migrate
```

The script sets `app.embedding_dim` from `EMBEDDING_DIMENSION` before applying SQL. If `usage_events` already exists, it skips.

#### Verify migrations (optional)

With `pnpm dev` running and at least one user signed up:

```bash
pnpm db:verify-usage
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET` in `.env`. Confirms `usage_events` exists and `GET /usage` returns data.

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `pnpm: command not found` | Run `corepack enable` (see Prerequisites) |
| Signup/login redirect errors | Set Site URL + Redirect URLs in Supabase (see above) |
| `pnpm db:migrate` connection refused / timeout | Check `SUPABASE_DB_PASSWORD` or `DATABASE_URL`; set `SUPABASE_DB_HOST` to your region's pooler host |
| Chat/documents return 401 | Sign out and back in; ensure `pnpm setup` ran after editing `.env` |
| Embedding dimension error on save | `EMBEDDING_DIMENSION` must match your model and the pgvector column (1536 for `text-embedding-3-small`) |
| `pnpm build` fails on fonts | Needs network access (Google Fonts fetched at build time) |

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
| `EMBEDDING_DIMENSION` | Single source of truth for vector width (default `1536`) — drives both the pgvector column and the app-side validation |

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

**Different embedding dimension (e.g. `nomic-embed-text` = 768):** set `EMBEDDING_DIMENSION`
and that's it — the pgvector column width is no longer hardcoded. The init migration reads an
`app.embedding_dim` GUC that `pnpm db:migrate` sets from `EMBEDDING_DIMENSION` (falling back to
`1536` for a raw SQL-editor paste), and the `match_document_chunks` RPC takes an unsized `vector`.
The API also validates every embedding's length against `EMBEDDING_DIMENSION`, so a mismatch fails
loudly instead of corrupting the index.

- On a **fresh** database: set the var, run `pnpm db:migrate`, done.
- On an **existing** database: changing dimension is a destructive re-index — drop `document_chunks`
  (or reset the DB), re-migrate, then re-save documents so they re-embed.
- HNSW indexes pgvector at **≤ 2000 dims**; above that (e.g. `text-embedding-3-large` at 3072) drop
  the HNSW index or use the model's `dimensions` param to stay ≤ 2000.

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
