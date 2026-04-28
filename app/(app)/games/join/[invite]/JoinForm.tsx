'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ui/components/primitives';
import { joinGame } from '@/app/actions/games';

export function JoinForm({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await joinGame({ inviteCode });
      if (!result.ok) {
        setError(formatError(result.error));
        return;
      }
      router.push(`/games/${result.data.id}/lobby`);
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={onClick} disabled={isPending}>
        {isPending ? 'Joining…' : 'Join game'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-premium-tw">
          {error}
        </p>
      )}
    </div>
  );
}

function formatError(error: { code: string; reason?: string }): string {
  if (error.code === 'forbidden' && error.reason === 'lobby-full') {
    return 'This game is already full.';
  }
  if (error.code === 'forbidden' && error.reason === 'already-joined') {
    return "You're already in this game.";
  }
  if (error.code === 'not-found') return 'Invite not found or expired.';
  if (error.code === 'state-conflict') return 'This game has already started.';
  return 'Could not join the game.';
}
