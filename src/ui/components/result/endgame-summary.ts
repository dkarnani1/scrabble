// Pure helpers that derive the EndgameOverlay's per-player summary from a
// `GameView`. Lives next to the overlay so the wiring is a one-line call from
// the result page; kept side-effect-free so the data shape can be reused if
// the overlay later moves into the play page.

import type { CommittedMove, GameResult, PlayerSlot } from '@rules/types';
import type { EndgamePlayerSummary } from './EndgameOverlay';

export type DerivePlayerSummaryArgs = {
  slot: PlayerSlot;
  name: string;
  history: ReadonlyArray<CommittedMove>;
  result: GameResult;
};

export function derivePlayerSummary({
  slot,
  name,
  history,
  result,
}: DerivePlayerSummaryArgs): EndgamePlayerSummary {
  let movesPlayed = 0;
  let bingos = 0;
  let bestScore = -Infinity;
  let bestWord: { word: string; score: number } | null = null;
  let placeScoreSum = 0;

  for (const c of history) {
    if (c.move.kind !== 'place') continue;
    if (c.move.playerSlot !== slot) continue;
    movesPlayed += 1;
    placeScoreSum += c.move.score;
    if (c.move.isBingo) bingos += 1;
    if (c.move.score > bestScore && c.move.words.length > 0) {
      bestScore = c.move.score;
      bestWord = { word: c.move.words[0]!, score: c.move.score };
    }
  }

  const finalScore = result.finalScores[slot] ?? 0;
  // Inferred — the rules engine applies a remaining-tile bonus / penalty when
  // the bag empties, and propagates pass/forfeit penalties into finalScores.
  // Anything not accounted for by raw place-move scoring is the adjustment.
  const endgameAdjustment = finalScore - placeScoreSum;

  return {
    name,
    score: finalScore,
    movesPlayed,
    bingos,
    bestWord,
    endgameAdjustment,
  };
}

export function outcomeFor(result: GameResult, mySlot: PlayerSlot | null): 'win' | 'lose' | 'draw' {
  if (result.winnerSlot === 'tie') return 'draw';
  if (mySlot !== null && result.winnerSlot === mySlot) return 'win';
  return 'lose';
}

export function reasonLabel(reason: GameResult['endedReason']): string {
  switch (reason) {
    case 'out-of-tiles':
      return 'No tiles left in the bag.';
    case 'six-pass-termination':
      return 'Game ended after six consecutive passes.';
    case 'abandoned':
      return 'Game was abandoned.';
  }
}
