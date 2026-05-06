'use client';

import * as React from 'react';
import { Square } from './Square';
import type { Board, Tile } from '@rules/types';

export type TentativePlacement = {
  coord: { r: number; c: number };
  tile: Tile;
  rackIndex?: number;
};

export type BoardCanvasProps = {
  board: Board;
  tentativePlacements: ReadonlyArray<TentativePlacement>;
  lastMoveCells?: ReadonlyArray<{ r: number; c: number }>;
  onSquareClick?: (coord: { r: number; c: number }) => void;
  /** When false, board is read-only — no drop targets active and no tentative drag. */
  dndEnabled?: boolean;
};

const SIZE = 15;

export function BoardCanvas({
  board,
  tentativePlacements,
  lastMoveCells = [],
  onSquareClick,
  dndEnabled = true,
}: BoardCanvasProps) {
  const tentativeMap = React.useMemo(() => {
    const m = new Map<string, { tile: Tile; rackIndex: number | null }>();
    for (const p of tentativePlacements) {
      m.set(`${p.coord.r},${p.coord.c}`, {
        tile: p.tile,
        rackIndex: p.rackIndex ?? null,
      });
    }
    return m;
  }, [tentativePlacements]);

  const lastMap = React.useMemo(
    () => new Set(lastMoveCells.map((c) => `${c.r},${c.c}`)),
    [lastMoveCells],
  );

  const [cursor, setCursor] = React.useState<{ r: number; c: number }>({ r: 7, c: 7 });

  const focusAt = React.useCallback((r: number, c: number) => {
    setCursor({ r, c });
    queueMicrotask(() => {
      const sel = `[data-board-cursor="${r}-${c}"]`;
      const el = document.querySelector<HTMLButtonElement>(sel);
      el?.focus();
    });
  }, []);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const { r, c } = cursor;
    let next: { r: number; c: number } | null = null;
    if (e.key === 'ArrowUp') next = { r: Math.max(0, r - 1), c };
    else if (e.key === 'ArrowDown') next = { r: Math.min(SIZE - 1, r + 1), c };
    else if (e.key === 'ArrowLeft') next = { r, c: Math.max(0, c - 1) };
    else if (e.key === 'ArrowRight') next = { r, c: Math.min(SIZE - 1, c + 1) };
    if (next) {
      e.preventDefault();
      focusAt(next.r, next.c);
    }
  };

  return (
    <div className="rounded-xl bg-board-felt bg-felt-noise p-3 shadow-board-deep ring-1 ring-tile-ink/10 sm:p-4">
      <div
        data-testid="board-canvas"
        className="grid w-full grid-cols-15 gap-[2px] bg-tile-ink/15"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
        role="grid"
        aria-label="Game board"
        onKeyDown={onKeyDown}
      >
        {board.cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const committed = cell?.tile ?? null;
            const tent = tentativeMap.get(key) ?? null;
            const tentativeTile = tent?.tile ?? null;
            const tentativeRackIndex = tent?.rackIndex ?? null;
            // A square can accept a drop if it's empty (no committed tile and no tentative tile).
            const canAcceptDrop = committed === null && tentativeTile === null;
            return (
              <Square
                key={key}
                r={r}
                c={c}
                premium={board.premiums[r]![c]!}
                committedTile={committed}
                tentativeTile={tentativeTile}
                tentativeRackIndex={tentativeRackIndex}
                canAcceptDrop={canAcceptDrop}
                dndEnabled={dndEnabled}
                isLastMoveCell={lastMap.has(key)}
                ariaLabel={`Square row ${r + 1} column ${c + 1}`}
                tabIndex={cursor.r === r && cursor.c === c ? 0 : -1}
                cursorKey={`${r}-${c}`}
                onClick={onSquareClick ? () => onSquareClick({ r, c }) : undefined}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
