'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await api.uploadFile('/upload', file);
      router.push('/documents?indexed=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <p className="terminal-label">› corpus / ingest</p>
        <CardTitle>Upload document</CardTitle>
        <p className="text-sm text-muted-foreground">
          PDF or TXT. Parsed, chunked, and embedded into the retrievable index.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className="group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/40 p-8 text-center transition-colors hover:border-primary/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files[0];
              if (dropped) setFile(dropped);
            }}
          >
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              id="file-upload"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <p className="font-mono text-sm text-primary">{file.name}</p>
              ) : (
                <p className="font-mono text-sm text-muted-foreground">
                  drag &amp; drop PDF or TXT, or click to browse{' '}
                  <span className="text-muted-foreground/60">(max 5MB)</span>
                </p>
              )}
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!file || loading}>
            {loading ? 'Uploading...' : 'Upload & index'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
