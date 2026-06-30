'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getToken(): Promise<string | null> {
  // Session lives in HTTP-only cookies — read via server route, not browser client
  const res = await fetch('/api/auth/token', { credentials: 'include' });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated — please sign in again');
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),

  async uploadFile(path: string, file: File) {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated — please sign in again');
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  },

  async streamMessage(
    conversationId: string,
    content: string,
    handlers: {
      onToken: (token: string) => void;
      onCitation: (citations: unknown[]) => void;
      onDone: (message: unknown) => void;
      onError: (error: string) => void;
    },
  ) {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated — please sign in again');
    }
    const res = await fetch(
      `${API_URL}/conversations/${conversationId}/messages/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      },
    );

    if (!res.ok || !res.body) {
      throw new Error('Stream request failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        const eventLine = lines.find((l) => l.startsWith('event: '));
        const dataLine = lines.find((l) => l.startsWith('data: '));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.replace('event: ', '');
        const data = JSON.parse(dataLine.replace('data: ', ''));

        if (event === 'token') handlers.onToken(data as string);
        if (event === 'citation') handlers.onCitation(data as unknown[]);
        if (event === 'done') handlers.onDone(data);
        if (event === 'error') handlers.onError(data as string);
      }
    }
  },
};
