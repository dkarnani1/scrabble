'use client';

import { cn } from '@ui/lib/classnames';
import type { CommittedMove } from '@rules/types';

export type MoveRowProps = {
  committed: CommittedMove;
  playerName: string;
};

export function MoveRow({ committed, playerName }: MoveRowProps) {
  const move = committed.move;
  const challenge = committed.challenge;
  const challengeBadge =
    challenge.kind === 'challenged-invalid'
      ? 'rejected'
      : challenge.kind === 'challenged-valid'
        ? 'upheld'
        : null;
  const disputedWords =
    challenge.kind === 'challenged-invalid' && challenge.invalidWords.length > 0
      ? challenge.invalidWords.join(', ')
      : null;

  return (
    <li className="flex items-baseline justify-between gap-2 rounded-md border border-board-line bg-board-base/50 px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="font-medium">{playerName}</span>
        <span className="text-xs text-tile-ink/70">
          {move.kind === 'place' && `${move.words.join(', ')}${move.isBingo ? ' · Bingo!' : ''}`}
          {move.kind === 'pass' && (move.reason === 'forced-timeout' ? 'Timed out' : 'Passed')}
          {move.kind === 'exchange' && `Exchanged ${move.count} tile${move.count === 1 ? '' : 's'}`}
        </span>
        {challengeBadge && (
          <span
            className={cn(
              'mt-0.5 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold',
              challengeBadge === 'rejected'
                ? 'bg-premium-tw/20 text-premium-tw'
                : 'bg-tile-edge/20 text-tile-edge',
            )}
          >
            challenge {challengeBadge}
          </span>
        )}
        {disputedWords && (
          <span className="text-[10px] text-premium-tw/80">disputed: {disputedWords}</span>
        )}
      </div>
      <div className="text-right">
        <span className="font-mono text-base">
          {move.kind === 'place' ? `+${move.score}` : '0'}
        </span>
        <span className="ml-1 text-[10px] text-tile-ink/60">#{move.seq}</span>
      </div>
    </li>
  );
}
