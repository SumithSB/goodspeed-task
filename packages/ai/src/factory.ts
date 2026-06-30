import type { AIProvider, AIProviderConfig } from './types';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (!config.apiKey) {
    throw new Error('AI_API_KEY is required');
  }
  return new OpenAICompatibleProvider(config);
}

function notConfigured(): never {
  throw new Error('AI_API_KEY is not configured — add it to .env');
}

export function createAIProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AIProvider {
  const chatApiKey = env.AI_API_KEY;
  if (!chatApiKey) {
    return {
      chat: async () => notConfigured(),
      chatStream: async function* () {
        notConfigured();
      },
      embed: async () => notConfigured(),
    };
  }

  const chatBaseURL = env.AI_BASE_URL ?? 'https://api.openai.com/v1';
  const embeddingBaseURL = env.AI_EMBEDDING_BASE_URL ?? chatBaseURL;
  const embeddingApiKey = env.AI_EMBEDDING_API_KEY ?? chatApiKey;
  const defaultChatModel = env.AI_CHAT_MODEL ?? 'gpt-4o-mini';
  const defaultEmbeddingModel =
    env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

  const chatProvider = createAIProvider({
    baseURL: chatBaseURL,
    apiKey: chatApiKey,
    defaultChatModel,
    defaultEmbeddingModel,
  });

  if (embeddingBaseURL === chatBaseURL && embeddingApiKey === chatApiKey) {
    return chatProvider;
  }

  const embeddingProvider = createAIProvider({
    baseURL: embeddingBaseURL,
    apiKey: embeddingApiKey,
    defaultChatModel,
    defaultEmbeddingModel,
  });

  return {
    chat: (request) => chatProvider.chat(request),
    chatStream: (request) => chatProvider.chatStream(request),
    embed: (request) => embeddingProvider.embed(request),
  };
}
