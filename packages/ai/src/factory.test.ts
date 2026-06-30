import { describe, expect, it } from 'vitest';
import { createAIProvider } from './factory';

describe('createAIProvider', () => {
  it('throws when apiKey is missing', () => {
    expect(() =>
      createAIProvider({
        apiKey: '',
        defaultChatModel: 'gpt-4o-mini',
        defaultEmbeddingModel: 'text-embedding-3-small',
      }),
    ).toThrow('AI_API_KEY is required');
  });

  it('creates provider with config', () => {
    const provider = createAIProvider({
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
      defaultChatModel: 'gpt-4o-mini',
      defaultEmbeddingModel: 'text-embedding-3-small',
    });
    expect(provider).toBeDefined();
    expect(typeof provider.chat).toBe('function');
    expect(typeof provider.embed).toBe('function');
  });
});

describe('createAIProviderFromEnv', () => {
  it('uses a composite provider when embedding credentials differ', async () => {
    const { createAIProviderFromEnv } = await import('./factory');
    const provider = createAIProviderFromEnv({
      AI_API_KEY: 'chat-key',
      AI_BASE_URL: 'http://localhost:11434/v1',
      AI_CHAT_MODEL: 'llama3.2',
      AI_EMBEDDING_BASE_URL: 'https://api.openai.com/v1',
      AI_EMBEDDING_API_KEY: 'embed-key',
      AI_EMBEDDING_MODEL: 'text-embedding-3-small',
    });
    expect(typeof provider.chat).toBe('function');
    expect(typeof provider.embed).toBe('function');
  });
});
