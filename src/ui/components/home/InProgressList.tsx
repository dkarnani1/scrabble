'use client';

// In-progress games list with resume CTA. Used on the home page to allow players to
// rejoin games they had open in another tab/device. Pure presentation — caller
// supplies the list from `listMyGames`.

import Link from 'next/link';
import type { GameView } from '@/app/actions/types';

export type InProgressListProps = {
  games: GameView[];
  myUserId: string;
};

export function InProgressList({ games, myUserId }: InProgressListProps) {
  if (games.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-board-line bg-board-base/40 px-4 py-8 text-center text-sm text-tile-ink/70">
        No active games yet.
        <br />
        Start a new game and invite a friend.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {games.map((g) => {
        const opponent = g.players.find((p) => p.userId !== myUserId);
        const me = g.players.find((p) => p.userId === myUserId);
        const isMyTurn = g.activeSlot != null && me?.slot === g.activeSlot;
        const target = g.phase === 'lobby' ? `/games/${g.id}/lobby` : `/games/${g.id}/play`;
        const subtitle =
          g.phase === 'lobby'
            ? 'Lobby — waiting'
            : g.phase === 'playing'
              ? isMyTurn
                ? 'Your turn — resume'
                : `${opponent?.displayName ?? 'Opponent'}’s turn`
              : g.phase === 'challenge-window'
                ? 'Challenge window'
                : g.phase;

        return (
          <li key={g.id}>
            <Link
              href={target}
              className="flex items-center justify-between rounded-md border border-board-line bg-board-base/60 px-4 py-3 hover:bg-board-line/30"
            >
              <span className="flex flex-col">
                <span className="font-medium">vs {opponent?.displayName ?? 'waiting…'}</span>
                <span className="text-xs text-tile-ink/60">{subtitle}</span>
              </span>
              <span className="text-xs text-tile-edge">Resume →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
