'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailTaken, setEmailTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEmailTaken(false);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    const isExistingEmail =
      authError?.message?.toLowerCase().includes('already registered') ||
      authError?.code === 'user_already_exists' ||
      data.user?.identities?.length === 0;

    if (isExistingEmail) {
      setEmailTaken(true);
      setError(
        'An account with this email already exists. Sign in with this email or use a different one.',
      );
      setLoading(false);
      return;
    }

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push('/documents');
      router.refresh();
      return;
    }
    const params = new URLSearchParams({ signup: 'confirm', email });
    router.push(`/login?${params}`);
  }

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
            <p className="terminal-label">› provision</p>
            <h1 className="mt-1.5 font-mono text-lg font-semibold text-foreground">
              Create account
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 p-6">
            <label className="block space-y-1.5">
              <span className="terminal-label">email</span>
              <Input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTaken(false);
                }}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="terminal-label">password</span>
              <Input
                type="password"
                placeholder="min 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                minLength={6}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="terminal-label">confirm password</span>
              <Input
                type="password"
                placeholder="re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
                minLength={6}
                aria-invalid={passwordsMismatch}
                aria-describedby={passwordsMismatch ? 'confirm-password-error' : undefined}
                className={passwordsMismatch ? 'border-destructive' : undefined}
              />
            </label>
            {passwordsMismatch && (
              <p
                id="confirm-password-error"
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive"
              >
                Passwords do not match.
              </p>
            )}
            {error && (
              <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                <p>{error}</p>
                {emailTaken && (
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in with this email
                  </Link>
                )}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || passwordsMismatch}
            >
              {loading ? 'provisioning…' : 'Sign up'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
