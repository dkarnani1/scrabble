'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@ui/components/primitives';
import { setDisplayName } from '@/app/actions/profile';

export type DisplayNamePromptProps = {
  initialValue?: string;
  redirectTo?: string;
};

export function DisplayNamePrompt({
  initialValue = '',
  redirectTo = '/home',
}: DisplayNamePromptProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setDisplayName({ displayName: value.trim() });
      if (!result.ok) {
        if (result.error.code === 'invalid-input') {
          setError(result.error.issues[0]?.message ?? 'Invalid display name.');
        } else {
          setError('Could not save display name.');
        }
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="display-name">
        Display name
      </label>
      <Input
        id="display-name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What should opponents call you?"
        autoFocus
        minLength={2}
        maxLength={32}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-premium-tw">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending || value.trim().length < 2}>
        {isPending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
