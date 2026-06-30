# API (`apps/api`)

NestJS backend for the Goodspeed Knowledge Base — auth, documents, RAG, chat (SSE), upload, usage.

**Setup, env vars, migrations, and verification:** see the [root README](../../README.md).

```bash
# from repo root
pnpm setup && pnpm dev    # runs web + api together
pnpm db:verify-usage      # after Supabase migrations
```

API only (from this directory):

```bash
pnpm run start:dev
```

Health check: http://localhost:4000/health
