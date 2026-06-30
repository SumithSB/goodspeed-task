import type { Message } from '@goodspeed/shared';
import { buildSummaryPrompt, selectHistoryWindow } from './history-compactor';

function msg(id: string, content: string): Message {
  return {
    id,
    conversationId: 'c1',
    userId: 'u1',
    role: 'user',
    content,
    citations: null,
    createdAt: '2026-01-01',
  };
}

function makeHistory(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => msg(String(i), `message ${i}`));
}

describe('selectHistoryWindow', () => {
  const tokenBudget = 100000; // large so the budget never trims in these cases

  it('keeps everything verbatim when history fits the recent window', () => {
    const history = makeHistory(4);
    const win = selectHistoryWindow({
      history,
      summaryMessageCount: 0,
      recentTurns: 6,
      tokenBudget,
    });
    expect(win.olderToSummarize).toHaveLength(0);
    expect(win.recent).toHaveLength(4);
    expect(win.newWatermark).toBe(0);
  });

  it('summarizes the overflow beyond the recent window', () => {
    const history = makeHistory(10);
    const win = selectHistoryWindow({
      history,
      summaryMessageCount: 0,
      recentTurns: 6,
      tokenBudget,
    });
    expect(win.olderToSummarize.map((m) => m.id)).toEqual(['0', '1', '2', '3']);
    expect(win.recent.map((m) => m.id)).toEqual(['4', '5', '6', '7', '8', '9']);
    expect(win.newWatermark).toBe(4);
  });

  it('only folds messages new since the watermark', () => {
    const history = makeHistory(12);
    const win = selectHistoryWindow({
      history,
      summaryMessageCount: 4, // 0-3 already summarized
      recentTurns: 6,
      tokenBudget,
    });
    expect(win.olderToSummarize.map((m) => m.id)).toEqual(['4', '5']);
    expect(win.recent.map((m) => m.id)).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
    expect(win.newWatermark).toBe(6);
  });

  it('does not re-summarize when nothing new has scrolled out', () => {
    const history = makeHistory(8);
    const win = selectHistoryWindow({
      history,
      summaryMessageCount: 2,
      recentTurns: 6,
      tokenBudget,
    });
    expect(win.olderToSummarize).toHaveLength(0);
    expect(win.recent).toHaveLength(6);
    expect(win.newWatermark).toBe(2); // unchanged
  });

  it('shrinks the recent window when it exceeds the token budget', () => {
    const history = makeHistory(6);
    // Each "message i" is ~10 chars ≈ 3 tokens; a tiny budget forces trimming.
    const win = selectHistoryWindow({
      history,
      summaryMessageCount: 0,
      recentTurns: 6,
      tokenBudget: 3,
    });
    expect(win.recent.length).toBeLessThan(6);
    expect(win.olderToSummarize.length).toBeGreaterThan(0);
    // recent + older covers the whole history
    expect(win.olderToSummarize.length + win.recent.length).toBe(6);
  });
});

describe('buildSummaryPrompt', () => {
  it('includes the existing summary and the new messages', () => {
    const [system, user] = buildSummaryPrompt('prior summary', [
      msg('1', 'hello there'),
    ]);
    expect(system?.role).toBe('system');
    expect(user?.content).toContain('prior summary');
    expect(user?.content).toContain('user: hello there');
  });

  it('handles an empty existing summary', () => {
    const [, user] = buildSummaryPrompt(null, [msg('1', 'first message')]);
    expect(user?.content).toContain('(no summary yet)');
  });
});
