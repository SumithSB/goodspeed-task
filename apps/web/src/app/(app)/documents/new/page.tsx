'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewDocumentPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post<{ id: string }>('/documents', {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      router.push('/documents?indexed=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <p className="terminal-label">› corpus / ingest</p>
        <CardTitle>New document</CardTitle>
        <p className="text-sm text-muted-foreground">
          On save, the text is chunked (~500 tokens, 250 overlap) and embedded into the index.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            placeholder="Markdown or plain text content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px]"
            required
          />
          <Input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create & index'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
