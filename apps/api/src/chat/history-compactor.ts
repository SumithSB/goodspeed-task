import type { ChatMessage } from '@goodspeed/ai';
import type { Message } from '@goodspeed/shared';
import { estimateTokenCount } from '../rag/chunker';

/**
 * Context-window management for chat. Recent turns are kept verbatim; older turns
 * are folded into a rolling per-conversation summary. The conversation row stores
 * the summary and a watermark (`summary_message_count`) of how many messages have
 * already been summarized, so each turn only summarizes the *new* older messages.
 */

export const SUMMARY_SYSTEM_PROMPT = `You maintain a running summary of a conversation between a user and a knowledge-base assistant.

You receive the existing summary (may be empty) and the new messages that have scrolled out of the recent window. Produce an updated summary that folds the new messages into the existing one.

Rules:
- Preserve concrete facts the assistant will need later: the user's goals, topics and documents discussed, decisions, named entities, and any answers already given.
- Resolve pronouns to their subjects so the summary is self-contained.
- Be compact and factual. No preamble, no "the user said" filler where a direct statement works.
- Output ONLY the updated summary text. No labels, no markdown headers.`;

export interface HistoryWindow {
  /** Older messages not yet summarized, to fold into the summary this turn. */
  olderToSummarize: Message[];
  /** Most recent messages kept verbatim in the prompt. */
  recent: Message[];
  /** New watermark = count of messages now covered by the summary. */
  newWatermark: number;
}

export interface SelectHistoryWindowArgs {
  history: Message[];
  summaryMessageCount: number;
  recentTurns: number;
  tokenBudget: number;
}

/**
 * Split history into {older-to-summarize, recent}. The recent window is the last
 * `recentTurns` messages, trimmed further from the front if it exceeds `tokenBudget`.
 * Everything between the existing watermark and the recent window is new material to
 * summarize.
 */
export function selectHistoryWindow({
  history,
  summaryMessageCount,
  recentTurns,
  tokenBudget,
}: SelectHistoryWindowArgs): HistoryWindow {
  const total = history.length;
  const watermark = Math.min(Math.max(summaryMessageCount, 0), total);

  // Start with the last `recentTurns` messages, then shrink to fit the token budget.
  let recentStart = Math.max(total - Math.max(recentTurns, 0), watermark);
  while (
    recentStart < total - 1 &&
    estimateTokenCount(joinContents(history.slice(recentStart))) > tokenBudget
  ) {
    recentStart += 1;
  }

  const olderToSummarize = history.slice(watermark, recentStart);
  const recent = history.slice(recentStart);

  return {
    olderToSummarize,
    recent,
    // If we summarized new material, the watermark advances to the recent window.
    // Otherwise it stays put.
    newWatermark: olderToSummarize.length > 0 ? recentStart : watermark,
  };
}

export function buildSummaryPrompt(
  existingSummary: string | null,
  olderMessages: Message[],
): ChatMessage[] {
  const existing = existingSummary?.trim()
    ? existingSummary.trim()
    : '(no summary yet)';
  const newMessages = olderMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  return [
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Existing summary:\n${existing}\n\nNew messages to fold in:\n${newMessages}`,
    },
  ];
}

function joinContents(messages: Message[]): string {
  return messages.map((m) => m.content).join('\n');
}
