export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: {
    totalTokens: number;
  };
}

export interface AIProvider {
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatStream(request: ChatCompletionRequest): AsyncIterable<string>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export interface AIProviderConfig {
  baseURL?: string;
  apiKey: string;
  defaultChatModel: string;
  defaultEmbeddingModel: string;
}
