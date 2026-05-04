'use client';

import * as React from 'react';
import { Square } from './Square';
import type { Board, Tile } from '@rules/types';

export type BoardCanvasProps = {
  board: Board;
  tentativePlacements: ReadonlyArray<{ coord: { r: number; c: number }; tile: Tile }>;
  lastMoveCells?: ReadonlyArray<{ r: number; c: number }>;
  onSquareClick?: (coord: { r: number; c: number }) => void;
};

const SIZE = 15;

export function BoardCanvas({
  board,
  tentativePlacements,
  lastMoveCells = [],
  onSquareClick,
}: BoardCanvasProps) {
  const tentativeMap = React.useMemo(() => {
    const m = new Map<string, Tile>();
    for (const p of tentativePlacements) m.set(`${p.coord.r},${p.coord.c}`, p.tile);
    return m;
  }, [tentativePlacements]);

  const lastMap = React.useMemo(
    () => new Set(lastMoveCells.map((c) => `${c.r},${c.c}`)),
    [lastMoveCells],
  );

  // Keyboard cursor: arrow keys move focus; Enter activates the click handler. The
  // cursor lives in component state because the focused DOM button is the visual
  // source of truth.
  const [cursor, setCursor] = React.useState<{ r: number; c: number }>({ r: 7, c: 7 });

  const focusAt = React.useCallback((r: number, c: number) => {
    setCursor({ r, c });
    // Defer to next tick so the new tabIndex assignment has rendered.
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
    <div
      data-testid="board-canvas"
      className="grid w-full grid-cols-15 gap-px rounded-md border border-board-line bg-board-line p-1"
      style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      role="grid"
      aria-label="Game board"
      onKeyDown={onKeyDown}
    >
      {board.cells.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const committed = cell?.tile ?? null;
          const tentative = tentativeMap.get(key) ?? null;
          return (
            <Square
              key={key}
              premium={board.premiums[r]![c]!}
              committedTile={committed}
              tentativeTile={tentative}
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
  );
}
