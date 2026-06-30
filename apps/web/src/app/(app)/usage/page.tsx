'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, MessageSquare, Route, ScrollText } from 'lucide-react';
import type { UsageKind, UsageSummary } from '@goodspeed/shared';
import { api } from '@/lib/api';

const KIND_META: Record<
  UsageKind,
  { label: string; color: string; icon: typeof Activity; note: string }
> = {
  chat: {
    label: 'Chat',
    color: 'var(--primary)',
    icon: MessageSquare,
    note: 'answer generation',
  },
  embedding: {
    label: 'Embedding',
    color: 'var(--warn)',
    icon: Database,
    note: 'indexing + query vectors',
  },
  router: {
    label: 'Router',
    color: 'var(--muted-foreground)',
    icon: Route,
    note: 'search-vs-skip routing',
  },
  summary: {
    label: 'Summary',
    color: 'var(--primary)',
    icon: ScrollText,
    note: 'history compaction',
  },
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function UsagePage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.get<UsageSummary>('/usage');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const hasEstimated = data?.recent.some((e) => e.estimated) ?? false;

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-6">
        <p className="terminal-label">› telemetry / usage</p>
        <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
          Usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Token consumption across every AI call — chat, embeddings, routing, and summarization.
        </p>
      </header>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-md border border-border bg-surface/50"
            />
          ))}
        </div>
      )}

      {data && !loading && (
        <>
          {/* totals */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-5">
              <p className="terminal-label">total tokens</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
                {data.totalTokens.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatTokens(data.totalTokens)} across all calls
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-5">
              <p className="terminal-label">recorded calls</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
                {data.totalEvents.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                AI requests on your account
              </p>
            </div>
          </div>

          {/* breakdown by kind */}
          <section className="space-y-3">
            <p className="terminal-label">› by call type</p>
            {data.byKind.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
                <Activity className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-3 font-mono text-sm text-foreground">No usage yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Index a document or ask a question to start tracking tokens.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border bg-card">
                {data.byKind.map((row) => {
                  const meta = KIND_META[row.kind];
                  const Icon = meta.icon;
                  const pct =
                    data.totalTokens > 0
                      ? (row.totalTokens / data.totalTokens) * 100
                      : 0;
                  return (
                    <div
                      key={row.kind}
                      className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: `hsl(${meta.color})` }}
                      />
                      <div className="w-28 shrink-0">
                        <p className="font-mono text-sm text-foreground">{meta.label}</p>
                        <p className="font-mono text-[0.625rem] text-muted-foreground/70">
                          {row.events} call{row.events === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="bar-grow h-full rounded-full"
                          style={{
                            width: `${Math.max(2, pct)}%`,
                            background: `hsl(${meta.color})`,
                          }}
                        />
                      </div>
                      <div className="w-24 shrink-0 text-right">
                        <p className="font-mono text-sm tabular-nums text-foreground">
                          {row.totalTokens.toLocaleString()}
                        </p>
                        <p className="font-mono text-[0.625rem] text-muted-foreground/70">
                          {pct.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* recent events */}
          {data.recent.length > 0 && (
            <section className="space-y-3">
              <p className="terminal-label">› recent calls</p>
              <div className="overflow-hidden rounded-md border border-border bg-card">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border bg-surface/60 px-4 py-2 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                  <span>type · model</span>
                  <span className="text-right">tokens</span>
                  <span className="text-right">when</span>
                </div>
                {data.recent.map((e) => {
                  const meta = KIND_META[e.kind];
                  return (
                    <div
                      key={e.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <span
                          className="font-mono text-xs"
                          style={{ color: `hsl(${meta.color})` }}
                        >
                          {meta.label}
                        </span>
                        <span className="ml-2 truncate font-mono text-[0.6875rem] text-muted-foreground/70">
                          {e.model ?? '—'}
                        </span>
                        {e.estimated && (
                          <span className="ml-2 font-mono text-[0.625rem] text-muted-foreground/50">
                            ~est
                          </span>
                        )}
                      </div>
                      <span className="text-right font-mono text-xs tabular-nums text-foreground">
                        {e.totalTokens.toLocaleString()}
                      </span>
                      <span className="text-right font-mono text-[0.6875rem] text-muted-foreground/70">
                        {new Date(e.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
              {hasEstimated && (
                <p className="font-mono text-[0.625rem] text-muted-foreground/60">
                  ~est = streamed chat tokens are estimated; embeddings, routing, and
                  summaries are provider-reported.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
