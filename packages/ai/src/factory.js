"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAIProvider = createAIProvider;
exports.createAIProviderFromEnv = createAIProviderFromEnv;
const openai_compatible_provider_1 = require("./openai-compatible.provider");
function createAIProvider(config) {
    if (!config.apiKey) {
        throw new Error('AI_API_KEY is required');
    }
    return new openai_compatible_provider_1.OpenAICompatibleProvider(config);
}
function notConfigured() {
    throw new Error('AI_API_KEY is not configured — add it to .env');
}
function createAIProviderFromEnv(env = process.env) {
    if (!env.AI_API_KEY) {
        return {
            chat: async () => notConfigured(),
            chatStream: async function* () {
                notConfigured();
            },
            embed: async () => notConfigured(),
        };
    }
    return createAIProvider({
        baseURL: env.AI_BASE_URL,
        apiKey: env.AI_API_KEY,
        defaultChatModel: env.AI_CHAT_MODEL ?? 'gpt-4o-mini',
        defaultEmbeddingModel: env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    });
}
//# sourceMappingURL=factory.js.map