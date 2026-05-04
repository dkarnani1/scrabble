'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ui/components/primitives';
import { createGame } from '@/app/actions/games';
import type { TimerSetting } from '@rules/types';

const TIMER_OPTIONS: Array<{ value: TimerSetting; label: string; hint: string }> = [
  { value: 'none', label: 'Untimed', hint: 'No clock pressure' },
  { value: '30s', label: '30 seconds', hint: 'Snappy' },
  { value: '1m', label: '1 minute', hint: 'Default' },
  { value: '2m', label: '2 minutes', hint: 'Relaxed' },
];

export function NewGameForm() {
  const router = useRouter();
  const [timer, setTimer] = React.useState<TimerSetting>('1m');
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGame({
        timerSetting: timer,
        dictionaryId: 'enable-default',
      });
      if (!result.ok) {
        setError(formatError(result.error));
        return;
      }
      router.push(`/games/${result.data.gameId}/lobby`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
          Turn timer
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {TIMER_OPTIONS.map((opt) => {
            const active = timer === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col rounded-md border-2 p-3 transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tile-edge has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-board-base ${
                  active
                    ? 'border-tile-edge bg-tile-edge text-board-base shadow-md'
                    : 'border-board-line bg-board-base/40 hover:border-tile-edge/60 hover:bg-board-base/70'
                }`}
              >
                <input
                  type="radio"
                  name="timer"
                  value={opt.value}
                  className="sr-only"
                  checked={active}
                  onChange={() => setTimer(opt.value)}
                />
                <span className="font-medium">{opt.label}</span>
                <span className={`text-xs ${active ? 'text-board-base/85' : 'text-tile-ink/70'}`}>
                  {opt.hint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
          Dictionary
        </legend>
        <p className="rounded-md border border-board-line bg-board-base/40 px-3 py-2 text-sm">
          ENABLE-derived (default)
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
          Visibility
        </legend>
        <p className="rounded-md border border-board-line bg-board-base/40 px-3 py-2 text-sm">
          Invite-only (single-use link)
        </p>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-premium-tw">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create game'}
      </Button>
    </form>
  );
}

function formatError(error: { code: string; message?: string }): string {
  if (error.code === 'unauthenticated') return 'Please sign in to create a game.';
  return error.message ?? 'Could not create the game. Try again in a moment.';
}
