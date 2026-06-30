'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Document } from '@goodspeed/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const doc = await api.get<Document>(`/documents/${params.id}`);
      setTitle(doc.title);
      setContent(doc.content);
      setTags(doc.tags.join(', '));
    }
    void load();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.patch(`/documents/${params.id}`, {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      router.push('/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <p className="terminal-label">› corpus / revise</p>
        <CardTitle>Edit document</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saving re-chunks and re-embeds this record so retrieval stays in sync.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            placeholder="Content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px]"
            required
          />
          <Input placeholder="Tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save & re-index'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/documents">Back to documents</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
