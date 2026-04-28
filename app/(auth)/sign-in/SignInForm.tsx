'use client';

import * as React from 'react';
import { Button, Input } from '@ui/components/primitives';
import { getSupabaseBrowserClient } from '@persistence/supabase-browser';

export function SignInForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(initialError);
  const [info, setInfo] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
            : null;
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        setInfo('Check your inbox for the magic link.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Button type="submit" disabled={isPending || !email.includes('@')}>
        {isPending ? 'Sending…' : 'Send magic link'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-premium-tw">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-tile-ink/80">
          {info}
        </p>
      )}
    </form>
  );
}
