'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-sm animate-pulse rounded-md border border-border bg-card/80 p-6">
            <div className="h-6 w-32 rounded bg-surface" />
            <div className="mt-6 space-y-3">
              <div className="h-10 rounded bg-surface" />
              <div className="h-10 rounded bg-surface" />
              <div className="h-10 rounded bg-surface" />
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupConfirm, setSignupConfirm] = useState(false);

  useEffect(() => {
    if (searchParams.get('signup') === 'confirm') {
      setSignupConfirm(true);
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
      router.replace('/login');
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push('/documents');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-up">
        {/* wordmark */}
        <div className="mb-6 flex items-center gap-2">
          <span className="status-dot" aria-hidden />
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            goodspeed<span className="text-primary">_kb</span>
          </span>
        </div>

        <div className="rounded-md border border-border bg-card/80 backdrop-blur-sm">
          <div className="border-b border-border px-6 py-4">
            <p className="terminal-label">› authenticate</p>
            <h1 className="mt-1.5 font-mono text-lg font-semibold text-foreground">
              Sign in
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 p-6">
            {signupConfirm && (
              <div className="flex items-start justify-between gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-xs text-foreground">
                <span>
                  Account created. Check your email for a confirmation link, then sign in below.
                </span>
                <button
                  type="button"
                  onClick={() => setSignupConfirm(false)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="terminal-label">email</span>
              <Input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="terminal-label">password</span>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'authenticating…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          No account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
