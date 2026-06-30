import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { UsageEvent, UsageKind, UsageSummary } from '@goodspeed/shared';
import { SUPABASE_CLIENT } from '../common/tokens';

const USAGE_MIGRATION_HINT =
  'Usage schema not applied — run supabase/migrations/20250630000000_summary_and_usage.sql (pnpm db:migrate or Supabase SQL Editor).';

function isMissingUsageSchema(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('usage_events') ||
    (msg.includes('schema cache') && msg.includes('usage'))
  );
}

function throwIfMissingUsageSchema(error: {
  message?: string;
  code?: string;
}): never {
  if (isMissingUsageSchema(error)) {
    throw new ServiceUnavailableException(USAGE_MIGRATION_HINT);
  }
  throw new Error(error.message ?? 'Usage query failed');
}

export interface RecordUsageInput {
  kind: UsageKind;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimated?: boolean;
}

interface DbUsageEvent {
  id: string;
  kind: UsageKind;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated: boolean;
  created_at: string;
}

function mapEvent(row: DbUsageEvent): UsageEvent {
  return {
    id: row.id,
    kind: row.kind,
    model: row.model,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    estimated: row.estimated,
    createdAt: row.created_at,
  };
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Record one AI call. Best-effort: a failure here must never break the chat or
   * indexing request that triggered it, so errors are logged and swallowed.
   */
  async record(userId: string, input: RecordUsageInput): Promise<void> {
    const promptTokens = input.promptTokens ?? 0;
    const completionTokens = input.completionTokens ?? 0;
    const totalTokens = input.totalTokens ?? promptTokens + completionTokens;

    const { error } = await this.supabase.from('usage_events').insert({
      user_id: userId,
      kind: input.kind,
      model: input.model ?? null,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated: input.estimated ?? false,
    });

    if (error) {
      const detail = isMissingUsageSchema(error)
        ? USAGE_MIGRATION_HINT
        : error.message;
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(`Failed to record usage: ${detail}`);
      } else {
        this.logger.warn(`Failed to record usage: ${detail}`);
      }
    }
  }

  async summary(userId: string): Promise<UsageSummary> {
    const { data, error } = await this.supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      throwIfMissingUsageSchema(error);
    }

    const rows = (data as DbUsageEvent[]) ?? [];

    const byKindMap = new Map<
      UsageKind,
      { totalTokens: number; events: number }
    >();
    let totalTokens = 0;

    for (const row of rows) {
      totalTokens += row.total_tokens;
      const bucket = byKindMap.get(row.kind) ?? { totalTokens: 0, events: 0 };
      bucket.totalTokens += row.total_tokens;
      bucket.events += 1;
      byKindMap.set(row.kind, bucket);
    }

    return {
      totalTokens,
      totalEvents: rows.length,
      byKind: [...byKindMap.entries()]
        .map(([kind, v]) => ({ kind, ...v }))
        .sort((a, b) => b.totalTokens - a.totalTokens),
      recent: rows.slice(0, 20).map(mapEvent),
    };
  }
}
