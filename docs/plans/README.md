# Implementation plans (Goodspeed take-home)

Cursor-generated plans from this project, copied here so they survive `.cursor/` being gitignored and stay with the repo for submission reference.

## Master plan

| Plan | File |
|------|------|
| **Goodspeed RAG Knowledge Base** (greenfield architecture, slices, submission outline) | [`goodspeed_rag_knowledge_base_12e78af8.plan.md`](goodspeed_rag_knowledge_base_12e78af8.plan.md) |

## Follow-up plans (chronological)

| # | Plan | File |
|---|------|------|
| 1 | Fix post-create navigation | [`fix_post-create_navigation_b7818733.plan.md`](fix_post-create_navigation_b7818733.plan.md) |
| 2 | Signup confirmation UX | [`signup_confirmation_ux_e9bba60b.plan.md`](signup_confirmation_ux_e9bba60b.plan.md) |
| 3 | Duplicate signup message | [`duplicate_signup_message_af38b220.plan.md`](duplicate_signup_message_af38b220.plan.md) |
| 4 | Fix chat empty state | [`fix_chat_empty_state_374086a8.plan.md`](fix_chat_empty_state_374086a8.plan.md) |
| 5 | New chat session button | [`new_chat_session_button_197ff149.plan.md`](new_chat_session_button_197ff149.plan.md) |
| 6 | Chat session history sidebar | [`chat_session_history_sidebar_def808de.plan.md`](chat_session_history_sidebar_def808de.plan.md) |
| 7 | RAG router prompt refactor | [`rag_router_prompt_refactor_e6477b6f.plan.md`](rag_router_prompt_refactor_e6477b6f.plan.md) |
| 8 | Fix usage tracking | [`fix_usage_tracking_6f6758a4.plan.md`](fix_usage_tracking_6f6758a4.plan.md) |

## Implemented without a separate plan file

These were done in session but only documented in README / code:

- **Embedding provider swap** — `AI_EMBEDDING_BASE_URL`, `AI_EMBEDDING_API_KEY`, `EMBEDDING_DIMENSION` in `packages/ai` + `.env.example`
- **Submission docs** — README setup, Loom scripts, `.gitignore` hardening, `pnpm db:migrate` / `db:verify-usage`

## Source locations

- **Canonical (committed):** `docs/plans/` (this folder)
- **Cursor workspace copy:** `.cursor/plans/` (gitignored; kept in sync for agent use)
- **Global Cursor store:** `~/.cursor/plans/` (same filenames; may drift if new plans are created outside the repo)

To refresh from global Cursor plans:

```bash
cp ~/.cursor/plans/{fix_*,signup_*,duplicate_*,new_chat_*,chat_session_*,rag_router_*}.plan.md docs/plans/
cp .cursor/plans/goodspeed_rag_knowledge_base_12e78af8.plan.md docs/plans/
```
