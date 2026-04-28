// Placement validator. Pure: no I/O, no external state. Given a board snapshot, the
// active player's rack, and the proposed placement, returns either {ok: true, axis,
// sortedCells} or {ok: false, reason: <rule-violation>}.

import { BOARD_SIZE, isOnBoard } from './board';
import { isBlankTile, type Board, type PlacementCell, type Rack, type Tile } from './types';

export type PlacementAxis = 'horizontal' | 'vertical' | 'single';

export type PlacementError =
  | 'no-tiles-placed'
  | 'tile-not-on-rack'
  | 'blank-not-assigned'
  | 'square-already-occupied'
  | 'tiles-not-in-single-line'
  | 'tiles-not-contiguous'
  | 'first-move-must-cover-center'
  | 'not-connected-to-existing-tiles'
  | 'word-shorter-than-two';

export type PlacementValidation =
  | { ok: true; axis: PlacementAxis; sortedCells: PlacementCell[] }
  | { ok: false; reason: PlacementError };

export function validatePlacement(
  board: Board,
  rack: Rack,
  cells: ReadonlyArray<PlacementCell>,
): PlacementValidation {
  if (cells.length === 0) return { ok: false, reason: 'no-tiles-placed' };

  // 1. Every coord on the board, no duplicates, no overlap with existing.
  const seen = new Set<string>();
  for (const c of cells) {
    if (!isOnBoard(c.coord)) return { ok: false, reason: 'square-already-occupied' };
    const key = `${c.coord.r},${c.coord.c}`;
    if (seen.has(key)) return { ok: false, reason: 'square-already-occupied' };
    seen.add(key);
    if (board.cells[c.coord.r]![c.coord.c] !== null) {
      return { ok: false, reason: 'square-already-occupied' };
    }
    if (isBlankTile(c.tile) && c.tile.assigned === null) {
      return { ok: false, reason: 'blank-not-assigned' };
    }
  }

  // 2. Every placed tile maps to a tile on the rack (consume each rack tile at most once).
  if (
    !tilesAvailableOnRack(
      rack,
      cells.map((c) => c.tile),
    )
  ) {
    return { ok: false, reason: 'tile-not-on-rack' };
  }

  // 3. Single line check.
  const allSameRow = cells.every((c) => c.coord.r === cells[0]!.coord.r);
  const allSameCol = cells.every((c) => c.coord.c === cells[0]!.coord.c);
  if (!allSameRow && !allSameCol) {
    return { ok: false, reason: 'tiles-not-in-single-line' };
  }

  // Determine axis.
  const axis: PlacementAxis =
    cells.length === 1 ? 'single' : allSameRow ? 'horizontal' : 'vertical';

  // 4. Contiguity along the placement axis (gaps must be filled by existing tiles).
  const sortedCells =
    axis === 'vertical'
      ? cells.slice().sort((a, b) => a.coord.r - b.coord.r)
      : cells.slice().sort((a, b) => a.coord.c - b.coord.c);
  if (!contiguousThroughBoard(board, sortedCells, axis)) {
    return { ok: false, reason: 'tiles-not-contiguous' };
  }

  // 5. First-move-covers-center / connect-to-existing.
  const isFirstMove = boardIsEmpty(board);
  if (isFirstMove) {
    const coversCenter = cells.some((c) => c.coord.r === 7 && c.coord.c === 7);
    if (!coversCenter) return { ok: false, reason: 'first-move-must-cover-center' };
    if (cells.length < 2) return { ok: false, reason: 'word-shorter-than-two' };
  } else {
    if (!connectsToExisting(board, cells)) {
      return { ok: false, reason: 'not-connected-to-existing-tiles' };
    }
  }

  return { ok: true, axis, sortedCells };
}

// --- internals ---------------------------------------------------------------

function tilesAvailableOnRack(rack: Rack, placedTiles: Tile[]): boolean {
  // Match by kind+identity. Each rack tile can be consumed at most once.
  const remaining = rack.slice();
  for (const t of placedTiles) {
    const idx = remaining.findIndex((r) => sameTileShape(r, t));
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

function sameTileShape(a: Tile, b: Tile): boolean {
  if (isBlankTile(a)) return isBlankTile(b);
  if (isBlankTile(b)) return false;
  return a.letter === b.letter;
}

function boardIsEmpty(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.cells[r]![c] !== null) return false;
    }
  }
  return true;
}

function contiguousThroughBoard(
  board: Board,
  sortedCells: ReadonlyArray<PlacementCell>,
  axis: PlacementAxis,
): boolean {
  if (sortedCells.length <= 1) return true;
  const placedKeys = new Set(sortedCells.map((c) => `${c.coord.r},${c.coord.c}`));
  if (axis === 'horizontal') {
    const r = sortedCells[0]!.coord.r;
    const startC = sortedCells[0]!.coord.c;
    const endC = sortedCells.at(-1)!.coord.c;
    for (let c = startC; c <= endC; c++) {
      const isPlaced = placedKeys.has(`${r},${c}`);
      const onBoard = board.cells[r]![c] !== null;
      if (!isPlaced && !onBoard) return false;
    }
  } else if (axis === 'vertical') {
    const c = sortedCells[0]!.coord.c;
    const startR = sortedCells[0]!.coord.r;
    const endR = sortedCells.at(-1)!.coord.r;
    for (let r = startR; r <= endR; r++) {
      const isPlaced = placedKeys.has(`${r},${c}`);
      const onBoard = board.cells[r]![c] !== null;
      if (!isPlaced && !onBoard) return false;
    }
  }
  return true;
}

function connectsToExisting(board: Board, cells: ReadonlyArray<PlacementCell>): boolean {
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const c of cells) {
    for (const [dr, dc] of dirs) {
      const nr = c.coord.r + dr;
      const nc = c.coord.c + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (board.cells[nr]![nc] !== null) return true;
    }
  }
  return false;
}
