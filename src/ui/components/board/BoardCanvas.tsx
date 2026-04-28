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

  return (
    <div
      data-testid="board-canvas"
      className="grid w-full grid-cols-15 gap-px rounded-md border border-board-line bg-board-line p-1"
      style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
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
              onClick={onSquareClick ? () => onSquareClick({ r, c }) : undefined}
            />
          );
        }),
      )}
    </div>
  );
}
