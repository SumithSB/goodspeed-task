import {
  CONVERSATIONAL_SKIP,
  formatRouterUserMessage,
  parseRouterOutput,
} from './retrieval-router';

describe('parseRouterOutput', () => {
  const fallback = 'original question';

  it('returns skip for exact skip token', () => {
    expect(parseRouterOutput(CONVERSATIONAL_SKIP, fallback)).toEqual({
      kind: 'skip',
    });
  });

  it('returns skip for quoted skip token', () => {
    expect(parseRouterOutput(`"${CONVERSATIONAL_SKIP}"`, fallback)).toEqual({
      kind: 'skip',
    });
  });

  it('strips search query prefix', () => {
    expect(parseRouterOutput('Search query: refund policy', fallback)).toEqual({
      kind: 'search',
      query: 'refund policy',
    });
  });

  it('strips wrapping quotes from search query', () => {
    expect(parseRouterOutput('"enterprise pricing tiers"', fallback)).toEqual({
      kind: 'search',
      query: 'enterprise pricing tiers',
    });
  });

  it('strips markdown code fences', () => {
    expect(parseRouterOutput('```pricing```', fallback)).toEqual({
      kind: 'search',
      query: 'pricing',
    });
  });

  it('falls back when output is empty after stripping', () => {
    expect(parseRouterOutput('   ', fallback)).toEqual({
      kind: 'search',
      query: fallback,
    });
  });
});

describe('formatRouterUserMessage', () => {
  it('includes history and latest message', () => {
    const text = formatRouterUserMessage(
      [
        {
          id: '1',
          conversationId: 'c1',
          userId: 'u1',
          role: 'user',
          content: 'What is pricing?',
          citations: null,
          createdAt: '2026-01-01',
        },
      ],
      'Tell me more about it',
    );
    expect(text).toContain('user: What is pricing?');
    expect(text).toContain('Latest message: Tell me more about it');
  });

  it('handles empty history', () => {
    const text = formatRouterUserMessage([], 'Hello');
    expect(text).toContain('(no prior messages)');
    expect(text).toContain('Latest message: Hello');
  });
});
