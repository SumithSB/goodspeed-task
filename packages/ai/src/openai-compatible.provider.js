"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAICompatibleProvider {
    client;
    defaultChatModel;
    defaultEmbeddingModel;
    constructor(config) {
        this.client = new openai_1.default({
            baseURL: config.baseURL ?? 'https://api.openai.com/v1',
            apiKey: config.apiKey,
        });
        this.defaultChatModel = config.defaultChatModel;
        this.defaultEmbeddingModel = config.defaultEmbeddingModel;
    }
    async chat(request) {
        const response = await this.client.chat.completions.create({
            model: request.model ?? this.defaultChatModel,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
        });
        const content = response.choices[0]?.message?.content ?? '';
        return {
            content,
            usage: response.usage
                ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                }
                : undefined,
        };
    }
    async *chatStream(request) {
        const stream = await this.client.chat.completions.create({
            model: request.model ?? this.defaultChatModel,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true,
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                yield delta;
            }
        }
    }
    async embed(request) {
        const input = request.input;
        const response = await this.client.embeddings.create({
            model: request.model ?? this.defaultEmbeddingModel,
            input,
        });
        return {
            embeddings: response.data.map((item) => item.embedding),
            usage: response.usage
                ? { totalTokens: response.usage.total_tokens }
                : undefined,
        };
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
//# sourceMappingURL=openai-compatible.provider.js.map