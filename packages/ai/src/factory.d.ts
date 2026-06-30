import type { AIProvider, AIProviderConfig } from './types';
export declare function createAIProvider(config: AIProviderConfig): AIProvider;
export declare function createAIProviderFromEnv(env?: NodeJS.ProcessEnv): AIProvider;
