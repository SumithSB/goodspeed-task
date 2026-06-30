import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider } from '@goodspeed/ai';
import { EMBEDDING_DIMENSION } from '@goodspeed/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_PROVIDER, SUPABASE_CLIENT } from '../common/tokens';
import { UsageService } from '../usage/usage.service';
import { chunkText } from './chunker';

interface DbDocument {
  id: string;
  user_id: string;
  content: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly embeddingDimension: number;

  private readonly embeddingModel: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    private readonly usage: UsageService,
    config: ConfigService,
  ) {
    this.chunkSize = Number(config.get('RAG_CHUNK_SIZE') ?? 2000);
    this.chunkOverlap = Number(config.get('RAG_CHUNK_OVERLAP') ?? 250);
    this.embeddingDimension = Number(
      config.get('EMBEDDING_DIMENSION') ?? EMBEDDING_DIMENSION,
    );
    this.embeddingModel =
      config.get<string>('AI_EMBEDDING_MODEL') ?? 'text-embedding-3-small';
  }

  async reindexDocument(documentId: string, userId: string): Promise<void> {
    const { data: doc, error } = await this.supabase
      .from('documents')
      .select('id, user_id, content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single<DbDocument>();

    if (error || !doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    await this.supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);

    const chunks = chunkText(doc.content, {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    if (chunks.length === 0) {
      return;
    }

    const texts = chunks.map((c) => c.content);
    const { embeddings, usage } = await this.ai.embed({ input: texts });
    await this.usage.record(userId, {
      kind: 'embedding',
      model: this.embeddingModel,
      totalTokens: usage?.totalTokens ?? 0,
    });

    for (const embedding of embeddings) {
      if (embedding.length !== this.embeddingDimension) {
        throw new Error(
          `Embedding dimension mismatch: expected ${this.embeddingDimension}, got ${embedding.length}. Set EMBEDDING_DIMENSION to match your model and pgvector column.`,
        );
      }
    }

    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[i],
      token_count: chunk.tokenCount,
    }));

    const { error: insertError } = await this.supabase
      .from('document_chunks')
      .insert(rows);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    this.logger.log(
      `Indexed ${chunks.length} chunks for document ${documentId}`,
    );
  }

  async deleteDocumentChunks(
    documentId: string,
    userId: string,
  ): Promise<void> {
    await this.supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);
  }

  async searchChunks(
    query: string,
    topK: number,
    minScore: number,
    userId?: string,
  ): Promise<
    Array<{
      id: string;
      documentId: string;
      documentTitle: string;
      content: string;
      score: number;
    }>
  > {
    const { embeddings, usage } = await this.ai.embed({ input: query });
    if (userId) {
      await this.usage.record(userId, {
        kind: 'embedding',
        model: this.embeddingModel,
        totalTokens: usage?.totalTokens ?? 0,
      });
    }
    const queryEmbedding = embeddings[0];
    if (!queryEmbedding) {
      return [];
    }
    if (queryEmbedding.length !== this.embeddingDimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.embeddingDimension}, got ${queryEmbedding.length}`,
      );
    }

    const { data, error } = (await this.supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_count: topK,
      min_score: minScore,
    })) as {
      data: Array<{
        id: string;
        document_id: string;
        document_title: string;
        content: string;
        similarity: number;
      }> | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }

    const results = data ?? [];

    this.logger.debug(
      `Search query="${query}" results=${results.map((r) => r.similarity.toFixed(3)).join(', ')}`,
    );

    return results.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      content: r.content,
      score: r.similarity,
    }));
  }
}
