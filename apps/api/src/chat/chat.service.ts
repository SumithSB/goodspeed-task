import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, ChatMessage } from '@goodspeed/ai';
import type {
  Citation,
  Conversation,
  Message,
  PaginatedConversations,
} from '@goodspeed/shared';
import {
  DEFAULT_CHAT_HISTORY_TOKEN_BUDGET,
  DEFAULT_CHAT_RECENT_TURNS,
  DEFAULT_MIN_SCORE,
  DEFAULT_RELEVANCE_THRESHOLD,
  DEFAULT_TOP_K,
} from '@goodspeed/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_PROVIDER, SUPABASE_CLIENT } from '../common/tokens';
import { RagService } from '../rag/rag.service';
import { UsageService } from '../usage/usage.service';
import { estimateTokenCount } from '../rag/chunker';
import {
  formatRouterUserMessage,
  parseRouterOutput,
  ROUTER_SYSTEM_PROMPT,
  type RouterResult,
} from './retrieval-router';
import { buildSummaryPrompt, selectHistoryWindow } from './history-compactor';
import { filterRelevantChunks, OUT_OF_CORPUS_REFUSAL } from './relevance-gate';

interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  summary_message_count: number;
  created_at: string;
  updated_at: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

function mapConversation(row: DbConversation): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: DbMessage): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    citations: row.citations,
    createdAt: row.created_at,
  };
}

function buildChatSystemPrompt(excerpts: string): string {
  return `You are a friendly knowledge base assistant. The user is chatting with their personal document library.

How to respond:
- Greetings, thanks, farewells, and small talk: reply naturally, briefly, and warmly. No citations needed.
- "What can you do?" / help requests: explain you search their documents and answer questions from that content; suggest they ask about topics in their library or upload more documents.
- Document questions: answer ONLY using the numbered excerpts below. Never use general knowledge, world facts, or information outside these excerpts.
- Cite sources as [1], [2] matching excerpt numbers when you use excerpt content.
- If the excerpts do not contain enough information to answer a document question, say you could not find it in their documents and suggest rephrasing or adding relevant documents — do not guess or use outside knowledge.
- Stay concise, clear, and conversational.

Document excerpts (empty if none matched this turn):
${excerpts || '(none)'}`;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly topK: number;
  private readonly minScore: number;
  private readonly relevanceThreshold: number;
  private readonly recentTurns: number;
  private readonly historyTokenBudget: number;
  private readonly chatModel: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    private readonly rag: RagService,
    private readonly usage: UsageService,
    config: ConfigService,
  ) {
    this.topK = Number(config.get('RAG_TOP_K') ?? DEFAULT_TOP_K);
    this.minScore = Number(config.get('RAG_MIN_SCORE') ?? DEFAULT_MIN_SCORE);
    this.relevanceThreshold = Number(
      config.get('RAG_RELEVANCE_THRESHOLD') ?? DEFAULT_RELEVANCE_THRESHOLD,
    );
    this.recentTurns = Number(
      config.get('CHAT_RECENT_TURNS') ?? DEFAULT_CHAT_RECENT_TURNS,
    );
    this.historyTokenBudget = Number(
      config.get('CHAT_HISTORY_TOKEN_BUDGET') ??
        DEFAULT_CHAT_HISTORY_TOKEN_BUDGET,
    );
    this.chatModel = config.get<string>('AI_CHAT_MODEL') ?? 'gpt-4o-mini';
  }

  async createConversation(
    userId: string,
    title?: string,
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title ?? 'New conversation',
      })
      .select('*')
      .single<DbConversation>();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create conversation');
    }
    return mapConversation(data);
  }

  async listConversations(
    userId: string,
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedConversations> {
    await this.purgeEmptyConversations(userId);

    const { data, error, count } = await this.supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    return {
      items: (data as DbConversation[]).map(mapConversation),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async deleteIfEmpty(userId: string, conversationId: string): Promise<void> {
    await this.ensureConversation(userId, conversationId);
    const { count, error: countError } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (countError) {
      throw new Error(countError.message);
    }
    if ((count ?? 0) > 0) {
      return;
    }

    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getMessages(
    userId: string,
    conversationId: string,
  ): Promise<Message[]> {
    await this.ensureConversation(userId, conversationId);
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data as DbMessage[]).map(mapMessage);
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    const history = await this.getMessages(userId, conversationId);
    const { summary, recent } = await this.compactHistory(
      userId,
      conversationId,
      history,
    );
    const userMessage = await this.persistMessage(
      userId,
      conversationId,
      'user',
      content,
      null,
    );

    const { answer, citations } = await this.generateAnswer(
      userId,
      content,
      history,
      summary,
      recent,
    );
    const assistantMessage = await this.persistMessage(
      userId,
      conversationId,
      'assistant',
      answer,
      citations,
    );

    return { userMessage, assistantMessage };
  }

  async *streamMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): AsyncGenerator<
    | { type: 'citation'; data: Citation[] }
    | { type: 'token'; data: string }
    | { type: 'done'; data: Message }
    | { type: 'error'; data: string }
  > {
    try {
      const history = await this.getMessages(userId, conversationId);
      const { summary, recent } = await this.compactHistory(
        userId,
        conversationId,
        history,
      );
      await this.persistMessage(userId, conversationId, 'user', content, null);

      const { chunks, retrievalSkipped } = await this.retrieveChunks(
        content,
        history,
        userId,
      );
      const citations = this.buildCitations(chunks);
      yield { type: 'citation', data: citations };

      if (!retrievalSkipped && chunks.length === 0) {
        const assistantMessage = await this.persistMessage(
          userId,
          conversationId,
          'assistant',
          OUT_OF_CORPUS_REFUSAL,
          citations,
        );
        yield { type: 'token', data: OUT_OF_CORPUS_REFUSAL };
        yield { type: 'done', data: assistantMessage };
        return;
      }

      const messages = this.buildPromptMessages(
        content,
        summary,
        recent,
        chunks,
      );
      let fullContent = '';

      for await (const token of this.ai.chatStream({ messages })) {
        fullContent += token;
        yield { type: 'token', data: token };
      }

      // Streamed completions don't return usage across all OpenAI-compatible
      // providers, so chat tokens here are estimated (flagged in the usage view).
      await this.recordChatUsage(userId, messages, fullContent, true);

      const assistantMessage = await this.persistMessage(
        userId,
        conversationId,
        'assistant',
        fullContent,
        citations,
      );
      yield { type: 'done', data: assistantMessage };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stream failed';
      yield { type: 'error', data: message };
    }
  }

  private async generateAnswer(
    userId: string,
    content: string,
    history: Message[],
    summary: string | null,
    recent: Message[],
  ): Promise<{ answer: string; citations: Citation[] }> {
    const { chunks, retrievalSkipped } = await this.retrieveChunks(
      content,
      history,
      userId,
    );
    const citations = this.buildCitations(chunks);

    if (!retrievalSkipped && chunks.length === 0) {
      return { answer: OUT_OF_CORPUS_REFUSAL, citations };
    }

    const messages = this.buildPromptMessages(content, summary, recent, chunks);
    const response = await this.ai.chat({ messages });
    await this.usage.record(userId, {
      kind: 'chat',
      model: this.chatModel,
      promptTokens: response.usage?.promptTokens ?? 0,
      completionTokens: response.usage?.completionTokens ?? 0,
      estimated: !response.usage,
    });
    return { answer: response.content, citations };
  }

  /**
   * Fold older messages (those scrolled out of the recent window and not yet
   * summarized) into the conversation's rolling summary. Cheap per turn because
   * only new material is summarized. Falls back to the recent window on failure.
   */
  private async compactHistory(
    userId: string,
    conversationId: string,
    history: Message[],
  ): Promise<{ summary: string | null; recent: Message[] }> {
    const { summary: existingSummary, summaryMessageCount } =
      await this.getConversationSummary(userId, conversationId);

    const window = selectHistoryWindow({
      history,
      summaryMessageCount,
      recentTurns: this.recentTurns,
      tokenBudget: this.historyTokenBudget,
    });

    if (window.olderToSummarize.length === 0) {
      return { summary: existingSummary, recent: window.recent };
    }

    try {
      const messages = buildSummaryPrompt(
        existingSummary,
        window.olderToSummarize,
      );
      const response = await this.ai.chat({
        messages,
        temperature: 0,
        maxTokens: 400,
      });
      const newSummary = response.content.trim();

      await this.usage.record(userId, {
        kind: 'summary',
        model: this.chatModel,
        promptTokens: response.usage?.promptTokens ?? 0,
        completionTokens: response.usage?.completionTokens ?? 0,
        estimated: !response.usage,
      });

      await this.supabase
        .from('conversations')
        .update({
          summary: newSummary,
          summary_message_count: window.newWatermark,
        })
        .eq('id', conversationId)
        .eq('user_id', userId);

      this.logger.debug(
        `Compacted ${window.olderToSummarize.length} messages into summary (watermark=${window.newWatermark})`,
      );

      return { summary: newSummary, recent: window.recent };
    } catch (err) {
      this.logger.warn(
        `Summarization failed, falling back to recent window: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { summary: existingSummary, recent: window.recent };
    }
  }

  private async getConversationSummary(
    userId: string,
    conversationId: string,
  ): Promise<{ summary: string | null; summaryMessageCount: number }> {
    const { data } = await this.supabase
      .from('conversations')
      .select('summary, summary_message_count')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single<{ summary: string | null; summary_message_count: number }>();

    return {
      summary: data?.summary ?? null,
      summaryMessageCount: data?.summary_message_count ?? 0,
    };
  }

  private async recordChatUsage(
    userId: string,
    promptMessages: ChatMessage[],
    completion: string,
    estimated: boolean,
  ): Promise<void> {
    const promptTokens = estimateTokenCount(
      promptMessages.map((m) => m.content).join('\n'),
    );
    const completionTokens = estimateTokenCount(completion);
    await this.usage.record(userId, {
      kind: 'chat',
      model: this.chatModel,
      promptTokens,
      completionTokens,
      estimated,
    });
  }

  private async retrieveChunks(
    content: string,
    history: Message[],
    userId: string,
  ): Promise<{
    chunks: Array<{
      id: string;
      documentId: string;
      documentTitle: string;
      content: string;
      score: number;
    }>;
    retrievalSkipped: boolean;
  }> {
    const routed = await this.routeQuery(content, history, userId);
    if (routed.kind === 'skip') {
      this.logger.debug('Skipping retrieval — router marked conversational');
      return { chunks: [], retrievalSkipped: true };
    }

    this.logger.debug(`Router search query: ${routed.query}`);
    const raw = await this.rag.searchChunks(
      routed.query,
      this.topK,
      this.minScore,
      userId,
    );
    const chunks = filterRelevantChunks(raw, this.relevanceThreshold);
    this.logger.debug(
      `Relevance gate: ${raw.length} raw → ${chunks.length} above ${this.relevanceThreshold}`,
    );
    return { chunks, retrievalSkipped: false };
  }

  private async routeQuery(
    latest: string,
    history: Message[],
    userId: string,
  ): Promise<RouterResult> {
    try {
      const response = await this.ai.chat({
        messages: [
          { role: 'system', content: ROUTER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: formatRouterUserMessage(history, latest),
          },
        ],
        temperature: 0,
        maxTokens: 120,
      });

      await this.usage.record(userId, {
        kind: 'router',
        model: this.chatModel,
        promptTokens: response.usage?.promptTokens ?? 0,
        completionTokens: response.usage?.completionTokens ?? 0,
        estimated: !response.usage,
      });

      const parsed = parseRouterOutput(response.content, latest);
      this.logger.debug(
        `Router raw="${response.content.trim()}" parsed=${parsed.kind}${parsed.kind === 'search' ? ` query="${parsed.query}"` : ''}`,
      );
      return parsed;
    } catch (err) {
      this.logger.warn(
        `Router LLM failed, defaulting to search: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { kind: 'search', query: latest };
    }
  }

  private buildCitations(
    chunks: Array<{
      id: string;
      documentId: string;
      documentTitle: string;
      content: string;
      score: number;
    }>,
  ): Citation[] {
    return chunks.map((chunk, i) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      excerpt: chunk.content.slice(0, 300),
      score: chunk.score,
      index: i + 1,
    }));
  }

  private buildPromptMessages(
    question: string,
    summary: string | null,
    recent: Message[],
    chunks: Array<{ documentTitle: string; content: string }>,
  ): ChatMessage[] {
    const excerpts = chunks
      .map(
        (chunk, i) =>
          `[${i + 1}] (from "${chunk.documentTitle}") ${chunk.content}`,
      )
      .join('\n\n');

    const summaryMessage: ChatMessage[] = summary?.trim()
      ? [
          {
            role: 'system',
            content: `Summary of earlier conversation (for context):\n${summary.trim()}`,
          },
        ]
      : [];

    const recentMessages = recent.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return [
      {
        role: 'system',
        content: buildChatSystemPrompt(excerpts),
      },
      ...summaryMessage,
      ...recentMessages,
      { role: 'user', content: question },
    ];
  }

  private async persistMessage(
    userId: string,
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    citations: Citation[] | null,
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        citations,
      })
      .select('*')
      .single<DbMessage>();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save message');
    }

    await this.touchConversation(
      userId,
      conversationId,
      role === 'user' ? content : undefined,
    );

    return mapMessage(data);
  }

  private async touchConversation(
    userId: string,
    conversationId: string,
    userMessageContent?: string,
  ): Promise<void> {
    const { data: conv, error: fetchError } = await this.supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single<{ title: string }>();

    if (fetchError || !conv) {
      return;
    }

    let title = conv.title;
    if (
      userMessageContent &&
      (title === 'New conversation' || title === 'Chat session')
    ) {
      const trimmed = userMessageContent.replace(/\s+/g, ' ').trim();
      title = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
    }

    await this.supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId);
  }

  private async purgeEmptyConversations(userId: string): Promise<void> {
    const { data: convs, error } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (error || !convs?.length) {
      return;
    }

    for (const conv of convs) {
      await this.deleteIfEmpty(userId, conv.id).catch(() => {});
    }
  }

  private async ensureConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Conversation not found');
    }
  }
}
