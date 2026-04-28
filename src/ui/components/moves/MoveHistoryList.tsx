'use client';

import { MoveRow } from './MoveRow';
import type { CommittedMove, PlayerSlot } from '@rules/types';

export type MoveHistoryListProps = {
  history: ReadonlyArray<CommittedMove>;
  displayNameBySlot: Partial<Record<PlayerSlot, string>>;
};

export function MoveHistoryList({ history, displayNameBySlot }: MoveHistoryListProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-tile-edge">History</h2>
      {history.length === 0 ? (
        <p className="rounded-md border border-dashed border-board-line bg-board-base/40 px-3 py-4 text-center text-xs text-tile-ink/60">
          No moves yet.
        </p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {history
            .slice()
            .reverse()
            .map((c) => (
              <MoveRow
                key={c.move.seq}
                committed={c}
                playerName={displayNameBySlot[c.move.playerSlot] ?? `Player ${c.move.playerSlot}`}
              />
            ))}
        </ul>
      )}
    </section>
  );
}
