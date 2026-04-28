// Scoring. Per-cell premiums are consumed only by NEWLY placed tiles. A 7-tile
// placement adds a 50-point bingo bonus. Blank tiles contribute 0 letter value.

import { premiumAt } from './board';
import { identifyWords } from './words';
import { isBlankTile, type Board, type PlacementCell, type PremiumKind } from './types';

export type ScoringResult = {
  score: number;
  isBingo: boolean;
  mainWord: string;
  crossWords: string[];
};

export function scoreMove(
  board: Board,
  placement: ReadonlyArray<PlacementCell>,
  // The third arg is accepted for traceability but recomputed internally so the score
  // is always derived from the actual cells we'll write to the board.
  _hint?: { mainWord: string; crossWords: string[] },
): ScoringResult {
  const { runs } = identifyWords(board, placement);

  const allRuns = [runs.main, ...runs.crosses];
  let total = 0;
  for (const run of allRuns) {
    if (run.cells.length < 2) continue;
    let wordScore = 0;
    let wordMultiplier = 1;
    for (const cell of run.cells) {
      const letterValue = isBlankTile(cell.tile) ? 0 : cell.tile.value;
      if (cell.isNew) {
        const prem = premiumAt(cell.coord);
        wordScore += letterValue * letterMultiplier(prem);
        wordMultiplier *= wordPremiumMultiplier(prem);
      } else {
        wordScore += letterValue;
      }
    }
    total += wordScore * wordMultiplier;
  }

  const placedCount = placement.length;
  const isBingo = placedCount === 7;
  if (isBingo) total += 50;

  return {
    score: total,
    isBingo,
    mainWord: runs.main.word,
    crossWords: runs.crosses.map((c) => c.word),
  };
}

function letterMultiplier(kind: PremiumKind): number {
  if (kind === 'DL') return 2;
  if (kind === 'TL') return 3;
  return 1;
}

function wordPremiumMultiplier(kind: PremiumKind): number {
  if (kind === 'DW' || kind === 'CENTER') return 2;
  if (kind === 'TW') return 3;
  return 1;
}
