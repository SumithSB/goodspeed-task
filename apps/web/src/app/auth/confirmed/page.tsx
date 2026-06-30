import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EmailConfirmedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex items-center gap-2">
          <span className="status-dot" aria-hidden />
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            goodspeed<span className="text-primary">_kb</span>
          </span>
        </div>

        <div className="rounded-md border border-border bg-card/80 backdrop-blur-sm">
          <div className="border-b border-border px-6 py-4">
            <p className="terminal-label">› verify</p>
            <h1 className="mt-1.5 font-mono text-lg font-semibold text-foreground">
              Email confirmed
            </h1>
          </div>
          <div className="space-y-4 p-6">
            <p className="font-mono text-sm leading-relaxed text-muted-foreground">
              Your email address is verified. You can sign in to your account now.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
