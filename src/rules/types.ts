// Pure domain types for the rules engine. No imports from React, Next, Supabase, or
// any other layer — this file is the canonical contract that orchestration, persistence,
// and UI all marshal to and from.

export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
  | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export type LetterTile = { kind: 'letter'; letter: Letter; value: number };
export type BlankTile = { kind: 'blank'; assigned: Letter | null; value: 0 };
export type Tile = LetterTile | BlankTile;

export type Rack = readonly Tile[];

export type Coord = { r: number; c: number };

export type PremiumKind = 'none' | 'DL' | 'TL' | 'DW' | 'TW' | 'CENTER';

export type PlacedTile = {
  tile: Tile;
  placedInMoveSeq: number;
};

export type Board = {
  cells: ReadonlyArray<ReadonlyArray<PlacedTile | null>>;
  premiums: ReadonlyArray<ReadonlyArray<PremiumKind>>;
};

export type PlacementCell = { coord: Coord; tile: Tile };

export type PlayerSlot = 0 | 1 | 2 | 3;

export type PlaceMove = {
  kind: 'place';
  seq: number;
  playerSlot: PlayerSlot;
  tiles: PlacementCell[];
  score: number;
  words: string[];
  isBingo: boolean;
  createdAt: string;
};

export type PassMove = {
  kind: 'pass';
  seq: number;
  playerSlot: PlayerSlot;
  createdAt: string;
  reason: 'voluntary' | 'forced-timeout';
};

export type ExchangeMove = {
  kind: 'exchange';
  seq: number;
  playerSlot: PlayerSlot;
  count: number;
  createdAt: string;
};

export type Move = PlaceMove | PassMove | ExchangeMove;

export type ChallengeOutcome =
  | { kind: 'unchallenged' }
  | { kind: 'challenged-invalid'; challengerSlot: PlayerSlot; invalidWords: string[] }
  | { kind: 'challenged-valid'; challengerSlot: PlayerSlot };

export type CommittedMove = { move: Move; challenge: ChallengeOutcome };

export type GamePhase =
  | 'lobby'
  | 'playing'
  | 'challenge-window'
  | 'resolving-challenge'
  | 'completed'
  | 'abandoned';

export type TimerSetting = 'none' | '30s' | '1m' | '2m';

export type PendingChallenge = {
  moveSeq: number;
  challengerSlot: PlayerSlot;
  raisedAt: string;
};

export type GameResult = {
  winnerSlot: PlayerSlot | 'tie';
  finalScores: Partial<Record<PlayerSlot, number>>;
  endedReason: 'out-of-tiles' | 'six-pass-termination' | 'abandoned';
};

export type PlayerState = {
  slot: PlayerSlot;
  userId: string;
  displayName: string;
  score: number;
  rackSize: number;
  rack?: Rack;
  isHost: boolean;
  hasForfeitedNextTurn: boolean;
  connected: boolean;
  lastSeenAt: string | null;
};

export type GameState = {
  id: string;
  phase: GamePhase;
  players: ReadonlyArray<PlayerState>;
  activeSlot: PlayerSlot | null;
  turnStartedAt: string | null;
  turnDeadlineAt: string | null;
  timerSetting: TimerSetting;
  bagRemaining: number;
  board: Board;
  history: ReadonlyArray<CommittedMove>;
  consecutiveScorelessTurns: number;
  pendingChallenge: PendingChallenge | null;
  dictionaryId: string;
  rngSeed: string;
  createdAt: string;
  endedAt: string | null;
  result: GameResult | null;
};

// Convenience type guards.

export const isLetterTile = (t: Tile): t is LetterTile => t.kind === 'letter';
export const isBlankTile = (t: Tile): t is BlankTile => t.kind === 'blank';
