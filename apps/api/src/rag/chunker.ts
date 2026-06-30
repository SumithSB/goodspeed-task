export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
}

const HEADING_REGEX = /^#{1,6}\s+.+/m;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, options: ChunkOptions): TextChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const sections = splitByHeadings(text);
  const rawChunks: string[] = [];

  for (const section of sections) {
    if (section.length <= chunkSize) {
      rawChunks.push(section);
      continue;
    }
    rawChunks.push(...splitWithOverlap(section, chunkSize, chunkOverlap));
  }

  return rawChunks
    .map((content, index) => ({
      content: content.trim(),
      index,
      tokenCount: estimateTokenCount(content),
    }))
    .filter((c) => c.content.length > 0);
}

function splitByHeadings(text: string): string[] {
  const lines = text.split('\n');
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (HEADING_REGEX.test(line) && current.length > 0) {
      sections.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    sections.push(current.join('\n'));
  }
  return sections.length > 0 ? sections : [text];
}

function splitWithOverlap(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
      buffer = takeOverlap(buffer, overlap) + paragraph;
    } else {
      chunks.push(...splitLongParagraph(paragraph, chunkSize, overlap));
      buffer = '';
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks;
}

function splitLongParagraph(
  paragraph: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S+/g) ?? [paragraph];
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence.trim()}` : sentence.trim();
    if (candidate.length <= chunkSize) {
      buffer = candidate;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
      buffer = takeOverlap(buffer, overlap) + sentence.trim();
    } else {
      chunks.push(...splitByWords(sentence, chunkSize, overlap));
      buffer = '';
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks;
}

function splitByWords(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let buffer = '';

  for (const word of words) {
    const candidate = buffer ? `${buffer} ${word}` : word;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
      buffer = takeOverlap(buffer, overlap) + word;
    } else {
      chunks.push(word.slice(0, chunkSize));
      buffer = word.slice(Math.max(0, chunkSize - overlap));
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks;
}

function takeOverlap(text: string, overlap: number): string {
  if (overlap <= 0) {
    return '';
  }
  return text.slice(Math.max(0, text.length - overlap));
}
