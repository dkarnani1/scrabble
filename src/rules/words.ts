// Word identification. Given a board snapshot (BEFORE placement) and the placement,
// returns the main word string + an array of cross-word strings, plus a richer
// `runs` projection that scoring uses to walk cells and award per-cell premiums.

import { BOARD_SIZE } from './board';
import {
  isBlankTile,
  type Board,
  type Coord,
  type PlacedTile,
  type PlacementCell,
  type Tile,
} from './types';

export type WordRun = {
  axis: 'horizontal' | 'vertical';
  cells: Array<{ coord: Coord; tile: Tile; isNew: boolean }>;
  word: string;
};

export type IdentifiedWords = {
  mainWord: string;
  crossWords: string[];
  runs: { main: WordRun; crosses: WordRun[] };
};

export function identifyWords(
  board: Board,
  placement: ReadonlyArray<PlacementCell>,
): IdentifiedWords {
  if (placement.length === 0) throw new Error('identifyWords: empty placement');

  const placedMap = new Map<string, PlacementCell>();
  for (const p of placement) placedMap.set(key(p.coord), p);

  // Compose a virtual post-placement board for run extraction.
  const occupied = (r: number, c: number): { tile: Tile; isNew: boolean } | null => {
    const k = `${r},${c}`;
    const placed = placedMap.get(k);
    if (placed) return { tile: placed.tile, isNew: true };
    const cell = board.cells[r]?.[c] ?? null;
    if (cell) return { tile: cell.tile, isNew: false };
    return null;
  };

  const sameRow = placement.every((c) => c.coord.r === placement[0]!.coord.r);
  const sameCol = placement.every((c) => c.coord.c === placement[0]!.coord.c);
  let mainAxis: 'horizontal' | 'vertical';

  if (placement.length === 1) {
    // Pick the axis that yields a length ≥ 2 run; prefer horizontal if both qualify.
    const r = placement[0]!.coord.r;
    const c = placement[0]!.coord.c;
    const horiz = extractRun(occupied, { r, c }, 'horizontal');
    const vert = extractRun(occupied, { r, c }, 'vertical');
    if (horiz.cells.length >= 2) mainAxis = 'horizontal';
    else if (vert.cells.length >= 2) mainAxis = 'vertical';
    else mainAxis = 'horizontal'; // single-letter "main word" — will fail the ≥2 check upstream
  } else if (sameRow) {
    mainAxis = 'horizontal';
  } else if (sameCol) {
    mainAxis = 'vertical';
  } else {
    // Should not happen — placement validator catches this. Fall back to horizontal.
    mainAxis = 'horizontal';
  }

  const main = extractRun(occupied, placement[0]!.coord, mainAxis);

  const crosses: WordRun[] = [];
  for (const p of placement) {
    const crossAxis: 'horizontal' | 'vertical' =
      mainAxis === 'horizontal' ? 'vertical' : 'horizontal';
    const run = extractRun(occupied, p.coord, crossAxis);
    if (run.cells.length >= 2) crosses.push(run);
  }

  return {
    mainWord: main.word,
    crossWords: crosses.map((c) => c.word),
    runs: { main, crosses },
  };
}

function extractRun(
  occupied: (r: number, c: number) => { tile: Tile; isNew: boolean } | null,
  origin: Coord,
  axis: 'horizontal' | 'vertical',
): WordRun {
  const drdc = axis === 'horizontal' ? [0, 1] : [1, 0];
  // Walk left/up to find the run start.
  let sr = origin.r;
  let sc = origin.c;
  while (true) {
    const pr = sr - drdc[0]!;
    const pc = sc - drdc[1]!;
    if (pr < 0 || pc < 0 || pr >= BOARD_SIZE || pc >= BOARD_SIZE) break;
    if (occupied(pr, pc) === null) break;
    sr = pr;
    sc = pc;
  }
  // Walk right/down to find the run end.
  const cells: Array<{ coord: Coord; tile: Tile; isNew: boolean }> = [];
  let r = sr;
  let c = sc;
  while (r < BOARD_SIZE && c < BOARD_SIZE) {
    const o = occupied(r, c);
    if (!o) break;
    cells.push({ coord: { r, c }, tile: o.tile, isNew: o.isNew });
    r += drdc[0]!;
    c += drdc[1]!;
  }
  const word = cells.map((cell) => letterFor(cell.tile)).join('');
  return { axis, cells, word };
}

function letterFor(tile: Tile): string {
  if (isBlankTile(tile)) return tile.assigned ?? '?';
  return tile.letter;
}

function key(c: Coord): string {
  return `${c.r},${c.c}`;
}

// Helpers exposed for scoring/applyMove.
export function rebuildBoardCells(
  board: Board,
  placement: ReadonlyArray<PlacementCell>,
  newSeq: number,
): ReadonlyArray<ReadonlyArray<PlacedTile | null>> {
  const out: (PlacedTile | null)[][] = board.cells.map((row) => row.slice());
  for (const p of placement) {
    out[p.coord.r]![p.coord.c] = { tile: p.tile, placedInMoveSeq: newSeq };
  }
  return out;
}
