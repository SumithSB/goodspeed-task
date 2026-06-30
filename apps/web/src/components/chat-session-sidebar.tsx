'use client';

import type { Conversation } from '@goodspeed/shared';
import { cn } from '@/lib/utils';

interface ChatSessionSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}

export function ChatSessionSidebar({
  conversations,
  activeId,
  loading,
  disabled,
  onSelect,
}: ChatSessionSidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border pr-4">
      <p className="terminal-label pb-3">› sessions</p>
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md border border-border bg-surface/50"
              />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const active = conv.id === activeId;
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    disabled={disabled || active}
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-default',
                      active
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent hover:border-border hover:bg-surface/60 disabled:opacity-50',
                    )}
                  >
                    <p className="truncate font-mono text-xs font-medium text-foreground">
                      {conv.title}
                    </p>
                    <p className="mt-1 font-mono text-[0.625rem] text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                </li>
              );
            })}
            {conversations.length === 0 && !loading && (
              <p className="px-1 font-mono text-xs text-muted-foreground">
                No sessions yet
              </p>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}
