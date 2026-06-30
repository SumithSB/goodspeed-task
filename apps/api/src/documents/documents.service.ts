import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateDocumentInput,
  Document,
  PaginatedDocuments,
  UpdateDocumentInput,
} from '@goodspeed/shared';
import { SUPABASE_CLIENT } from '../common/tokens';
import { RagService } from '../rag/rag.service';

interface DbDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  source_type: 'manual' | 'upload';
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

function mapDocument(row: DbDocument): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    sourceType: row.source_type,
    sourceFilename: row.source_filename,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly rag: RagService,
  ) {}

  async list(
    userId: string,
    page = 1,
    pageSize = 20,
    tag?: string,
  ): Promise<PaginatedDocuments> {
    let query = this.supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return {
      items: (data as DbDocument[]).map(mapDocument),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getById(userId: string, id: string): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single<DbDocument>();

    if (error || !data) {
      throw new NotFoundException('Document not found');
    }
    return mapDocument(data);
  }

  async create(
    userId: string,
    input: CreateDocumentInput,
    sourceType: 'manual' | 'upload' = 'manual',
    sourceFilename?: string,
  ): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: input.title,
        content: input.content,
        tags: input.tags ?? [],
        source_type: sourceType,
        source_filename: sourceFilename ?? null,
      })
      .select('*')
      .single<DbDocument>();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create document');
    }

    await this.rag.reindexDocument(data.id, userId);
    return mapDocument(data);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateDocumentInput,
  ): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .update({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single<DbDocument>();

    if (error || !data) {
      throw new NotFoundException('Document not found');
    }

    await this.rag.reindexDocument(id, userId);
    return mapDocument(data);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.rag.deleteDocumentChunks(id, userId);
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Document not found');
    }
  }
}
