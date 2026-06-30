'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, MessageSquare, Upload, Activity, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/documents', label: 'Documents', icon: FileText, code: 'DOC' },
  { href: '/chat', label: 'Chat', icon: MessageSquare, code: 'RAG' },
  { href: '/documents/upload', label: 'Upload', icon: Upload, code: 'IDX' },
  { href: '/usage', label: 'Usage', icon: Activity, code: 'USE' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur-sm">
      {/* wordmark / brand bezel */}
      <div className="border-b border-border px-5 py-5">
        <Link href="/documents" className="group block">
          <div className="flex items-center gap-2">
            <span className="status-dot" aria-hidden />
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              goodspeed
              <span className="text-primary">_kb</span>
            </span>
          </div>
          <p className="terminal-label mt-2 pl-[15px]">retrieval terminal</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="terminal-label px-2 pb-2">› console</p>
        {navItems.map(({ href, label, icon: Icon, code }) => {
          const isUpload = href === '/documents/upload';
          const active = isUpload
            ? pathname === href
            : href === '/documents'
              ? pathname.startsWith('/documents') && pathname !== '/documents/upload'
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_0_hsl(var(--primary)/0.8)]" />
              )}
              <Icon
                className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')}
              />
              <span className="font-medium">{label}</span>
              <span
                className={cn(
                  'ml-auto font-mono text-[0.625rem] tracking-widest',
                  active ? 'text-primary/80' : 'text-muted-foreground/40',
                )}
              >
                {code}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* status readout */}
      <div className="space-y-2 border-t border-border px-5 py-4">
        <div className="flex items-center justify-between font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
          <span>status</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="status-dot" aria-hidden />
            online
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground/70">
          <span>index</span>
          <span>pgvector · top-5</span>
        </div>
        <button
          onClick={signOut}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-mono text-xs tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          sign out
        </button>
      </div>
    </aside>
  );
}
