import type { AIProvider, AIProviderConfig, ChatCompletionRequest, EmbeddingRequest } from './types';
export declare class OpenAICompatibleProvider implements AIProvider {
    private readonly client;
    private readonly defaultChatModel;
    private readonly defaultEmbeddingModel;
    constructor(config: AIProviderConfig);
    chat(request: ChatCompletionRequest): Promise<{
        content: string;
        usage: {
            promptTokens: number;
            completionTokens: number;
        } | undefined;
    }>;
    chatStream(request: ChatCompletionRequest): AsyncIterable<string>;
    embed(request: EmbeddingRequest): Promise<{
        embeddings: number[][];
        usage: {
            totalTokens: number;
        } | undefined;
    }>;
}
