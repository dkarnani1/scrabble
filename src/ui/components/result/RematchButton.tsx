'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ui/components/primitives';
import { rematch } from '@/app/actions/games';

export type RematchButtonProps = {
  priorGameId: string;
  amHost: boolean;
};

export function RematchButton({ priorGameId, amHost }: RematchButtonProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  if (!amHost) {
    return <p className="text-xs text-tile-ink/60">Only the host can start a rematch.</p>;
  }

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await rematch({ priorGameId });
      if (!result.ok) {
        setError('Could not create rematch.');
        return;
      }
      router.push(`/games/${result.data.gameId}/lobby`);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={onClick} disabled={isPending}>
        {isPending ? 'Creating rematch…' : 'Rematch'}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-premium-tw">
          {error}
        </p>
      )}
    </div>
  );
}
