// Builders for full GameState values. Tests pick a builder, optionally override fields,
// and feed the result straight into rules-engine functions.

import { createEmptyBoard } from '@rules/board';
import type {
  Board,
  CommittedMove,
  GamePhase,
  GameResult,
  GameState,
  PendingChallenge,
  PlayerSlot,
  PlayerState,
  TimerSetting,
} from '@rules/types';

export type GameBuilderOverrides = Partial<{
  id: string;
  phase: GamePhase;
  timerSetting: TimerSetting;
  activeSlot: PlayerSlot | null;
  turnStartedAt: string | null;
  turnDeadlineAt: string | null;
  bagRemaining: number;
  board: Board;
  history: CommittedMove[];
  consecutiveScorelessTurns: number;
  pendingChallenge: PendingChallenge | null;
  dictionaryId: string;
  rngSeed: string;
  createdAt: string;
  endedAt: string | null;
  result: GameResult | null;
  players: PlayerState[];
}>;

export const FIXED_GAME_ID = '00000000-0000-0000-0000-00000000aaaa';

export function makePlayer(slot: PlayerSlot, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    slot,
    userId: `00000000-0000-0000-0000-0000000000${slot}${slot}`,
    displayName: `Player ${slot}`,
    score: 0,
    rackSize: 7,
    isHost: slot === 0,
    hasForfeitedNextTurn: false,
    connected: true,
    lastSeenAt: '2026-04-27T12:00:00.000Z',
    ...overrides,
  };
}

export function buildLobbyGame(overrides: GameBuilderOverrides = {}): GameState {
  const board = overrides.board ?? createEmptyBoard();
  return {
    id: overrides.id ?? FIXED_GAME_ID,
    phase: overrides.phase ?? 'lobby',
    players: overrides.players ?? [makePlayer(0), makePlayer(1)],
    activeSlot: overrides.activeSlot ?? null,
    turnStartedAt: overrides.turnStartedAt ?? null,
    turnDeadlineAt: overrides.turnDeadlineAt ?? null,
    timerSetting: overrides.timerSetting ?? 'none',
    bagRemaining: overrides.bagRemaining ?? 100,
    board,
    history: overrides.history ?? [],
    consecutiveScorelessTurns: overrides.consecutiveScorelessTurns ?? 0,
    pendingChallenge: overrides.pendingChallenge ?? null,
    dictionaryId: overrides.dictionaryId ?? 'test-tiny',
    rngSeed: overrides.rngSeed ?? 'test-seed-001',
    createdAt: overrides.createdAt ?? '2026-04-27T12:00:00.000Z',
    endedAt: overrides.endedAt ?? null,
    result: overrides.result ?? null,
  };
}

export function buildPlayingGame(overrides: GameBuilderOverrides = {}): GameState {
  return buildLobbyGame({
    phase: 'playing',
    activeSlot: 0,
    turnStartedAt: '2026-04-27T12:00:10.000Z',
    bagRemaining: 86,
    ...overrides,
  });
}
