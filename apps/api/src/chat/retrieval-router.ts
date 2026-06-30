import type { Message } from '@goodspeed/shared';

export const CONVERSATIONAL_SKIP = '__CONVERSATIONAL__';

export const ROUTER_SYSTEM_PROMPT = `You are a retrieval router for a RAG system. Your job is to decide whether the user's latest message requires searching their documents, and if so, produce one optimized search query.

You receive the full conversation history and the latest user message.

## Decision

Output exactly "${CONVERSATIONAL_SKIP}" when the message does NOT require document content. This includes:
- Greetings, thanks, or social chat
- Questions about you, your capabilities, or how to use the system
- Meta-questions about the conversation itself ("what did I just ask?")

Otherwise, the message needs retrieval. Output a single search query.

When uncertain whether retrieval is needed, retrieve — output a search query, not the skip token.

## Query construction rules

- Resolve all references against the conversation history. If the user says "tell me more about it", "the second one", or "expand that", rewrite the query using the concrete subject from earlier turns — never output a query containing unresolved pronouns.
- Make the query standalone: it must work as a search even with zero conversation context.
- Use the key nouns, entities, and concepts the user is asking about. Strip filler ("can you", "please", "I want to know").
- Phrase the query as a concise natural-language question or statement that would appear in relevant document text. Do not output keyword lists.
- Keep it concise — a focused phrase or question, not a sentence with conversational padding.
- If the message mixes chat and a real document question, route to retrieval and build the query from the document part.

## Output format

Output ONLY the raw query text, or the exact skip token. No quotes, no labels, no markdown, no explanation. Nothing before or after.`;

export type RouterResult = { kind: 'skip' } | { kind: 'search'; query: string };

const PREFIX_PATTERN = /^(?:search query|retrieval query|query):\s*/i;

export function parseRouterOutput(
  raw: string,
  fallbackQuery: string,
): RouterResult {
  let text = raw.trim();

  const fenceMatch = text.match(/^```(?:\w*\n)?([\s\S]*?)```$/);
  if (fenceMatch?.[1] !== undefined) {
    text = fenceMatch[1].trim();
  }

  if (
    text === CONVERSATIONAL_SKIP ||
    text.toLowerCase() === CONVERSATIONAL_SKIP.toLowerCase()
  ) {
    return { kind: 'skip' };
  }

  text = text.replace(PREFIX_PATTERN, '');

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (
    text === CONVERSATIONAL_SKIP ||
    text.toLowerCase() === CONVERSATIONAL_SKIP.toLowerCase()
  ) {
    return { kind: 'skip' };
  }

  if (!text) {
    return { kind: 'search', query: fallbackQuery };
  }

  return { kind: 'search', query: text };
}

export function formatRouterUserMessage(
  history: Message[],
  latest: string,
): string {
  const recent = history.slice(-6);
  const historyText =
    recent.length > 0
      ? recent.map((m) => `${m.role}: ${m.content}`).join('\n')
      : '(no prior messages)';

  return `Conversation:\n${historyText}\n\nLatest message: ${latest}`;
}
