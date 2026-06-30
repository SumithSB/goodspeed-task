import { AppSidebar } from '@/components/app-sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* instrument top strip */}
        <header className="sticky top-0 z-10 flex h-9 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground/70">
            goodspeed · knowledge base
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground/70">
            <span className="status-dot" aria-hidden />
            session active
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-auto px-6 py-8 md:px-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
