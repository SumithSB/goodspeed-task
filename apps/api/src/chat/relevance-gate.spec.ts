import {
  filterRelevantChunks,
  hasRelevantContext,
  OUT_OF_CORPUS_REFUSAL,
} from './relevance-gate';

describe('filterRelevantChunks', () => {
  const chunks = [
    { id: 'a', score: 0.5 },
    { id: 'b', score: 0.35 },
    { id: 'c', score: 0.34 },
    { id: 'd', score: 0.2 },
  ];

  it('keeps chunks at or above threshold', () => {
    expect(filterRelevantChunks(chunks, 0.35)).toEqual([
      { id: 'a', score: 0.5 },
      { id: 'b', score: 0.35 },
    ]);
  });

  it('returns empty array when none qualify', () => {
    expect(filterRelevantChunks(chunks, 0.6)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterRelevantChunks([], 0.35)).toEqual([]);
  });
});

describe('hasRelevantContext', () => {
  it('is true when at least one chunk passes', () => {
    expect(hasRelevantContext([{ score: 0.36 }], 0.35)).toBe(true);
  });

  it('is false when all chunks are below threshold', () => {
    expect(hasRelevantContext([{ score: 0.34 }, { score: 0.2 }], 0.35)).toBe(
      false,
    );
  });

  it('is false for empty chunks', () => {
    expect(hasRelevantContext([], 0.35)).toBe(false);
  });
});

describe('OUT_OF_CORPUS_REFUSAL', () => {
  it('is a non-empty refusal string', () => {
    expect(OUT_OF_CORPUS_REFUSAL.length).toBeGreaterThan(20);
  });
});
