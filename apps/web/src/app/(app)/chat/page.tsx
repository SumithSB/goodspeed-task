'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, MessageSquarePlus, Search, Sparkles } from 'lucide-react';
import type { Citation, Conversation, Message, PaginatedConversations } from '@goodspeed/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChatSessionSidebar } from '@/components/chat-session-sidebar';

interface ChatMessage extends Message {
  streaming?: boolean;
}

const ACTIVE_CONVERSATION_KEY = 'goodspeed:activeConversationId';

/* score → label + color band. Real cosine-ish scores; 0.2 is the garbage floor. */
function scoreBand(score: number) {
  if (score >= 0.5) return { color: 'var(--primary)', label: 'strong' };
  if (score >= 0.3) return { color: 'var(--primary)', label: 'fair' };
  return { color: 'var(--warn)', label: 'weak' };
}

/* Renders answer text, turning [n] markers into chips linked to source rows. */
function CitedText({
  content,
  citations,
  onHover,
  activeIndex,
}: {
  content: string;
  citations: Citation[] | null;
  onHover: (i: number | null) => void;
  activeIndex: number | null;
}) {
  const byIndex = useMemo(() => {
    const m = new Map<number, Citation>();
    citations?.forEach((c) => m.set(c.index, c));
    return m;
  }, [citations]);

  const parts = content.split(/(\[\d+\])/g);

  return (
    <p className="whitespace-pre-wrap text-[0.9375rem] leading-7 text-foreground">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const n = Number(match[1]);
          if (byIndex.has(n)) {
            const active = activeIndex === n;
            return (
              <button
                key={i}
                onMouseEnter={() => onHover(n)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(n)}
                onBlur={() => onHover(null)}
                className={`mx-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] -translate-y-0.5 items-center justify-center rounded-sm border px-1 align-middle font-mono text-[0.625rem] font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                }`}
                aria-label={`Source ${n}`}
              >
                {n}
              </button>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function RetrievalTrace({
  citations,
  activeIndex,
  onHover,
}: {
  citations: Citation[];
  activeIndex: number | null;
  onHover: (i: number | null) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface/60">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3 w-3 text-primary" />
        <span className="terminal-label !text-[0.625rem]">retrieval trace</span>
        <span className="ml-auto font-mono text-[0.625rem] text-muted-foreground">
          {citations.length} source{citations.length === 1 ? '' : 's'} · routed: search
        </span>
      </div>
      <ul className="divide-y divide-border">
        {citations.map((c) => {
          const band = scoreBand(c.score);
          const active = activeIndex === c.index;
          return (
            <li
              key={c.chunkId}
              onMouseEnter={() => onHover(c.index)}
              onMouseLeave={() => onHover(null)}
              className={`px-3 py-2.5 transition-colors ${
                active ? 'bg-primary/[0.07]' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-sm border px-1 font-mono text-[0.625rem] font-medium ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/40 bg-primary/10 text-primary'
                  }`}
                >
                  {c.index}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                  {c.documentTitle}
                </span>

                {/* confidence meter — real similarity score */}
                <div className="flex w-28 items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="bar-grow h-full rounded-full"
                      style={{
                        width: `${Math.max(6, Math.min(100, c.score * 100))}%`,
                        background: `hsl(${band.color})`,
                      }}
                    />
                  </div>
                  <span
                    className="w-9 text-right font-mono text-[0.625rem] tabular-nums"
                    style={{ color: `hsl(${band.color})` }}
                  >
                    {c.score.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 line-clamp-2 pl-[1.7rem] text-xs leading-relaxed text-muted-foreground">
                {c.excerpt}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AssistantBlock({ msg }: { msg: ChatMessage }) {
  const [active, setActive] = useState<number | null>(null);
  const hasCitations = msg.citations && msg.citations.length > 0;
  const retrieving = msg.streaming && !msg.content && !hasCitations;

  return (
    <div className="animate-fade-up">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="terminal-label">assistant</span>
      </div>

      {retrieving ? (
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span className="status-dot" aria-hidden />
          querying knowledge base
          <span className="inline-flex w-6 justify-start">
            <span className="animate-pulse">…</span>
          </span>
        </div>
      ) : (
        <div className={msg.streaming ? 'caret' : ''}>
          <CitedText
            content={msg.content}
            citations={msg.citations}
            onHover={setActive}
            activeIndex={active}
          />
        </div>
      )}

      {hasCitations && (
        <RetrievalTrace
          citations={msg.citations as Citation[]}
          activeIndex={active}
          onHover={setActive}
        />
      )}

      {!msg.streaming && !hasCitations && msg.content && (
        <p className="mt-3 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground/60">
          routed: direct · no retrieval needed
        </p>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [startingNewChat, setStartingNewChat] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadConversations(): Promise<Conversation[]> {
    const data = await api.get<PaginatedConversations>(
      '/conversations?pageSize=50',
    );
    setConversations(data.items);
    return data.items;
  }

  async function abandonEmptyConversation(id: string | null) {
    if (!id || messages.length > 0) return;
    try {
      await api.delete(`/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ponytail: best-effort cleanup; list purge catches stragglers
    }
  }

  async function ensureConversationId(): Promise<string> {
    if (conversationId) return conversationId;
    const conv = await api.post<Conversation>('/conversations', {
      title: 'Chat session',
    });
    setConversationId(conv.id);
    sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, conv.id);
    return conv.id;
  }

  async function selectConversation(id: string) {
    setStartingNewChat(true);
    setError('');
    setInput('');
    try {
      const msgs = await api.get<Message[]>(`/conversations/${id}/messages`);
      setConversationId(id);
      setMessages(msgs);
      sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setStartingNewChat(false);
    }
  }

  async function startNewChat() {
    setError('');
    setInput('');
    setStartingNewChat(true);
    try {
      await abandonEmptyConversation(conversationId);
      setConversationId(null);
      setMessages([]);
      sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start chat');
    } finally {
      setStartingNewChat(false);
    }
  }

  useEffect(() => {
    async function init() {
      setLoadingSessions(true);
      setStartingNewChat(true);
      try {
        const items = await loadConversations();
        const stored = sessionStorage.getItem(ACTIVE_CONVERSATION_KEY);
        const targetId =
          stored && items.some((c) => c.id === stored)
            ? stored
            : items[0]?.id;

        if (targetId) {
          const msgs = await api.get<Message[]>(
            `/conversations/${targetId}/messages`,
          );
          setConversationId(targetId);
          setMessages(msgs);
          sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, targetId);
        } else {
          setConversationId(null);
          setMessages([]);
          sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start chat');
      } finally {
        setLoadingSessions(false);
        setStartingNewChat(false);
      }
    }
    void init();
  }, []);

  async function handleSelectSession(id: string) {
    if (loading || startingNewChat || id === conversationId) return;
    if (
      input.trim() &&
      !confirm('Switch session? Unsent input will be lost.')
    ) {
      return;
    }
    await abandonEmptyConversation(conversationId);
    await selectConversation(id);
  }

  async function handleNewChat() {
    if (loading || startingNewChat) return;
    if (
      messages.length > 0 &&
      !confirm(
        "Start a new chat? Current messages will stay saved but won't appear in this view.",
      )
    ) {
      return;
    }
    await startNewChat();
  }

  const chatReady = !loadingSessions && !startingNewChat;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const userContent = text.trim();
    if (!userContent || loading || startingNewChat) return;

    setInput('');
    setLoading(true);
    setError('');

    let activeId: string;
    try {
      activeId = await ensureConversationId();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start chat');
      setLoading(false);
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: activeId,
      userId: '',
      role: 'user',
      content: userContent,
      citations: null,
      createdAt: new Date().toISOString(),
    };

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        conversationId: activeId,
        userId: '',
        role: 'assistant',
        content: '',
        citations: null,
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ]);

    try {
      await api.streamMessage(activeId, userContent, {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m,
            ),
          );
        },
        onCitation: (citations) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, citations: citations as Citation[] }
                : m,
            ),
          );
        },
        onDone: (message) => {
          const final = message as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...final, streaming: false } : m,
            ),
          );
          void loadConversations().catch(() => {});
        },
        onError: (err) => setError(err),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-9.5rem)] gap-4">
      <ChatSessionSidebar
        conversations={conversations}
        activeId={conversationId}
        loading={loadingSessions}
        disabled={loading || startingNewChat}
        onSelect={(id) => void handleSelectSession(id)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
      {/* header */}
      <header className="mb-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="terminal-label">› retrieval · chat</p>
            <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
              Ask your corpus
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers are grounded in your documents — every claim traces back to a scored source.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading || startingNewChat}
            onClick={() => void handleNewChat()}
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </header>

      {/* conversation */}
      <div className="flex-1 overflow-y-auto pr-1">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="status-dot mb-5" aria-hidden />
            <p className="max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
              Ask a question about your indexed documents. Answers are grounded in
              your corpus with cited sources.
            </p>
          </div>
        ) : (
          <div className="space-y-8 pb-4">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-md border border-border bg-surface px-4 py-2.5">
                    <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <AssistantBlock key={msg.id} msg={msg} />
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-sm text-destructive">
          {error}
        </p>
      )}

      {/* prompt */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-primary/60"
      >
        <span className="font-mono text-sm text-primary">›</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={chatReady ? 'ask a question…' : 'connecting…'}
          disabled={loading || !chatReady}
          className="h-12 flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !chatReady || !input.trim()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-medium tracking-wide text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
        >
          send
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>
      </div>
    </div>
  );
}
