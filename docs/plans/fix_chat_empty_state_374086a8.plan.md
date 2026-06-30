---
name: Fix chat empty state
overview: Remove the hardcoded README-style example questions and technical empty-state copy from the chat page. Replace with a short, user-facing instruction with no suggestion chips.
todos:
  - id: remove-examples
    content: Remove EXAMPLES constant and suggestion chip buttons from chat/page.tsx
    status: completed
  - id: simplify-empty-copy
    content: Replace empty-state paragraph with short user-facing instruction text
    status: completed
isProject: false
---

# Fix chat empty state (remove unrelated examples)

## Problem

The chat empty state in [`apps/web/src/app/(app)/chat/page.tsx`](apps/web/src/app/(app)/chat/page.tsx) shows developer/README content:

```12:16:apps/web/src/app/(app)/chat/page.tsx
const EXAMPLES = [
  'What are the RAG defaults?',
  'How does the retrieval router decide to search?',
  'Which AI providers can I swap to?',
];
```

And this copy:

> *The retrieval engine routes your question, ranks matching chunks by cosine similarity, and synthesizes a cited answer. Try one:*

Those questions only match project README text, not the user's uploaded corpus — so they feel unrelated on the chat screen.

## Solution (your choice: minimal)

### 1. Remove `EXAMPLES` and the chip buttons

Delete the `EXAMPLES` constant and the `EXAMPLES.map(...)` button row in the empty state (lines ~324–337).

### 2. Replace empty-state copy with short user-facing text

Keep the existing empty-state layout (centered, status dot) but swap the paragraph for something like:

> *Ask a question about your indexed documents. Answers are grounded in your corpus with cited sources.*

This aligns with the page header (*"Answers are grounded in your documents"*) without repeating implementation jargon (cosine similarity, retrieval router).

No API calls, no new components, no backend changes.

## File to change

| File | Change |
|------|--------|
| [`apps/web/src/app/(app)/chat/page.tsx`](apps/web/src/app/(app)/chat/page.tsx) | Remove `EXAMPLES` + chips; simplify empty-state text |

## Verification

1. Open `/chat` with no messages → no example chips; short instruction only.
2. Send a message → empty state disappears; chat works unchanged.
3. `pnpm typecheck` and `pnpm lint` in `apps/web`.
