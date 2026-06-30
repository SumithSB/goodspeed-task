export interface ScoredChunk {
  score: number;
}

export const OUT_OF_CORPUS_REFUSAL =
  "I couldn't find anything about that in your documents. Try rephrasing, or add a document that covers this topic.";

export function filterRelevantChunks<T extends ScoredChunk>(
  chunks: T[],
  threshold: number,
): T[] {
  return chunks.filter((chunk) => chunk.score >= threshold);
}

export function hasRelevantContext<T extends ScoredChunk>(
  chunks: T[],
  threshold: number,
): boolean {
  return filterRelevantChunks(chunks, threshold).length > 0;
}
