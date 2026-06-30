'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import type { Document, PaginatedDocuments } from '@goodspeed/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <header className="border-b border-border pb-6">
            <p className="terminal-label">› corpus / registry</p>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
              Documents
            </h1>
          </header>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-md border border-border bg-surface/50"
              />
            ))}
          </div>
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}

function DocumentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PaginatedDocuments | null>(null);
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [indexedSuccess, setIndexedSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('indexed') === '1') {
      setIndexedSuccess(true);
      router.replace('/documents');
    }
  }, [searchParams, router]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
        const result = await api.get<PaginatedDocuments>(`/documents${query}`);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [tag]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? Its chunks will be removed from the index.')) return;
    await api.delete(`/documents/${id}`);
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((d: Document) => d.id !== id),
            total: prev.total - 1,
          }
        : prev,
    );
  }

  return (
    <div className="space-y-8">
      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <p className="terminal-label">› corpus / registry</p>
          <h1 className="font-mono text-3xl font-semibold tracking-tight text-foreground">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Every record is chunked, embedded, and retrievable.{' '}
            <span className="font-mono text-foreground">
              {data ? data.total : '—'}
            </span>{' '}
            indexed.
          </p>
        </div>
        <Link href="/documents/new">
          <Button>
            <Plus className="h-4 w-4" />
            New document
          </Button>
        </Link>
      </header>

      {/* filter */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          placeholder="filter by tag…"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="pl-9"
        />
      </div>

      {indexedSuccess && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-sm text-foreground">
          <span>Document indexed and added to the corpus.</span>
          <button
            type="button"
            onClick={() => setIndexedSuccess(false)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-border bg-surface/50"
            />
          ))}
        </div>
      )}

      {/* registry */}
      <div className="space-y-3">
        {data?.items.map((doc, i) => (
          <article
            key={doc.id}
            className="group animate-fade-up rounded-md border border-border bg-card transition-colors hover:border-primary/40"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex items-start gap-4 p-5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                <FileText className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground/60">
                    {doc.id.slice(0, 8)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground/60">
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    })}
                  </span>
                </div>

                <h2 className="mt-1.5 truncate font-mono text-lg font-medium text-foreground">
                  {doc.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {doc.content}
                </p>

                {doc.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {doc.tags.map((t) => (
                      <Badge key={t}>#{t}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                <Link href={`/documents/${doc.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </article>
        ))}

        {data?.items.length === 0 && !loading && (
          <div className="rounded-md border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
            <FileText className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-3 font-mono text-sm text-foreground">No records in the corpus</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a document to start building your retrievable knowledge base.
            </p>
            <Link href="/documents/new" className="mt-5 inline-block">
              <Button>
                <Plus className="h-4 w-4" />
                New document
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
