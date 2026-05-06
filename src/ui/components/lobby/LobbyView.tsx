'use client';

import * as React from 'react';
import { Button, Input } from '@ui/components/primitives';
import { InviteCodeBox } from './InviteCodeBox';
import { startGame, leaveLobby } from '@/app/actions/games';
import { setDisplayName } from '@/app/actions/profile';
import { useRouter } from 'next/navigation';
import { subscribeToGame } from '@realtime/game-channel';

export type LobbyPlayer = {
  slot: 0 | 1 | 2 | 3;
  userId: string;
  displayName: string;
  isHost: boolean;
};

export type LobbyViewProps = {
  gameId: string;
  inviteCode: string | null;
  inviteUrl: string | null;
  players: LobbyPlayer[];
  amHost: boolean;
  myUserId: string;
  timerSetting: 'none' | '30s' | '1m' | '2m';
  dictionaryId: string;
};

export function LobbyView({
  gameId,
  inviteCode,
  inviteUrl,
  players,
  amHost,
  myUserId,
  timerSetting,
  dictionaryId,
}: LobbyViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const lobbyFull = players.length >= 2;

  // Realtime: re-fetch the server-rendered lobby whenever a player joins/leaves
  // or the game phase changes (so guests are auto-routed to /play when the host
  // starts). The page itself handles all redirect logic — we just kick a refresh.
  React.useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeToGame({
      gameId,
      onChange: () => {
        if (!cancelled) router.refresh();
      },
      onStatusChange: (status) => {
        if (status === 'subscribed' && !cancelled) router.refresh();
      },
    });
    // Polling backstop in case the websocket drops or RLS filters an event we
    // expected. Cheap on this page — the lobby payload is small.
    const interval = window.setInterval(() => {
      if (!cancelled) router.refresh();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      void unsubscribe();
    };
  }, [gameId, router]);

  function onStart() {
    setError(null);
    startTransition(async () => {
      const result = await startGame({ gameId });
      if (!result.ok) {
        setError(formatError(result.error));
        return;
      }
      router.push(`/games/${gameId}/play`);
    });
  }

  function onLeave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveLobby({ gameId });
      if (!result.ok) {
        setError(formatError(result.error));
        return;
      }
      router.push('/home');
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Lobby</h1>
          <p className="text-sm text-tile-ink/70">
            Timer: <span className="font-medium">{labelForTimer(timerSetting)}</span> · Dictionary:{' '}
            <span className="font-medium">{dictionaryId}</span>
          </p>
        </header>

        <ul className="space-y-2">
          {players
            .slice()
            .sort((a, b) => a.slot - b.slot)
            .map((p) => (
              <li
                key={p.userId}
                className="flex items-center justify-between gap-3 rounded-md border border-board-line bg-board-base/60 px-4 py-3"
              >
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tile-edge text-xs font-semibold text-tile-face">
                    {p.slot + 1}
                  </span>
                  {p.userId === myUserId ? (
                    <DisplayNameField currentName={p.displayName} />
                  ) : (
                    <span className="font-medium truncate">{p.displayName}</span>
                  )}
                </div>
                {p.isHost && (
                  <span className="shrink-0 rounded-full bg-board-line px-2 py-0.5 text-xs font-medium text-tile-ink">
                    host
                  </span>
                )}
              </li>
            ))}
          {!lobbyFull && (
            <li className="rounded-md border border-dashed border-board-line bg-board-base/30 px-4 py-3 text-sm text-tile-ink/70">
              Waiting for opponent…
            </li>
          )}
        </ul>

        <div className="flex flex-wrap gap-2">
          {amHost ? (
            <Button onClick={onStart} disabled={!lobbyFull || isPending}>
              {isPending ? 'Starting…' : 'Start game'}
            </Button>
          ) : (
            <p className="text-sm text-tile-ink/70">Waiting for host to start…</p>
          )}
          <Button variant="outline" onClick={onLeave} disabled={isPending}>
            Leave lobby
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-premium-tw">
            {error}
          </p>
        )}
      </section>

      {amHost && inviteCode && inviteUrl && !lobbyFull && (
        <InviteCodeBox inviteCode={inviteCode} inviteUrl={inviteUrl} />
      )}
    </div>
  );
}

function DisplayNameField({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(currentName);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function onCancel() {
    setEditing(false);
    setError(null);
    setValue(currentName);
  }

  function onSave() {
    const next = value.trim();
    if (next === currentName) {
      onCancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setDisplayName({ displayName: next });
      if (!result.ok) {
        if (result.error.code === 'invalid-input') {
          setError(result.error.issues[0]?.message ?? 'Invalid display name.');
        } else {
          setError('Could not save display name.');
        }
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate">{currentName}</span>
        <button
          type="button"
          onClick={() => {
            setValue(currentName);
            setEditing(true);
          }}
          className="text-xs text-tile-edge underline shrink-0"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1 min-w-0">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          minLength={2}
          maxLength={32}
          aria-label="Display name"
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={onSave} disabled={isPending || value.trim().length < 2}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-premium-tw">
          {error}
        </p>
      )}
    </div>
  );
}

function labelForTimer(t: LobbyViewProps['timerSetting']): string {
  switch (t) {
    case 'none':
      return 'untimed';
    case '30s':
      return '30 seconds';
    case '1m':
      return '1 minute';
    case '2m':
      return '2 minutes';
  }
}

function formatError(error: { code: string; reason?: string; message?: string }): string {
  if (error.code === 'forbidden' && error.reason === 'lobby-not-full') {
    return 'Both seats need to be filled before the game can start.';
  }
  if (error.code === 'forbidden' && error.reason === 'not-host') {
    return 'Only the host can start the game.';
  }
  if (error.code === 'state-conflict') {
    return 'This lobby is no longer accepting that action.';
  }
  if (error.code === 'unauthenticated') return 'You need to sign in.';
  return error.message ?? 'Something went wrong.';
}
