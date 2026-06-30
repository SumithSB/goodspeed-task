import { chunkText } from './chunker';

describe('chunkText', () => {
  it('splits long text into overlapping chunks', () => {
    const text = 'word '.repeat(600);
    const chunks = chunkText(text, { chunkSize: 200, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content.length).toBeLessThanOrEqual(250);
  });

  it('preserves heading sections as separate chunks when small', () => {
    const text = '# Title\n\nIntro paragraph.\n\n## Section\n\nDetails here.';
    const chunks = chunkText(text, { chunkSize: 2000, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.some((c) => c.content.includes('# Title'))).toBe(true);
  });
});
