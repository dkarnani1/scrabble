// Shared types for the Server Action contract surface. The shapes match the
// `ActionError` / `ActionResult<T>` definitions in
// `specs/001-scrabble-multiplayer/contracts/server-actions.md`.

import type {
  Board,
  CommittedMove,
  GamePhase,
  GameResult,
  PendingChallenge,
  PlayerSlot,
  Rack,
  TimerSetting,
} from '@rules/types';

export type ActionError =
  | { code: 'unauthenticated' }
  | { code: 'forbidden'; reason: string }
  | { code: 'not-found'; entity: 'game' | 'invite' }
  | { code: 'invalid-input'; issues: { path: string; message: string }[] }
  | {
      code: 'rule-violation';
      reason:
        | 'first-move-must-cover-center'
        | 'tiles-not-in-single-line'
        | 'tiles-not-contiguous'
        | 'not-connected-to-existing-tiles'
        | 'no-tiles-placed'
        | 'tile-not-on-rack'
        | 'blank-not-assigned'
        | 'square-already-occupied'
        | 'exchange-bag-too-small'
        | 'word-shorter-than-two';
    }
  | {
      code: 'state-conflict';
      reason:
        | 'not-your-turn'
        | 'wrong-game-phase'
        | 'challenge-window-closed'
        | 'challenge-already-raised'
        | 'turn-already-resolved'
        | 'game-completed';
    }
  | { code: 'rate-limited' }
  | { code: 'internal-error'; message: string };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export type GameView = {
  id: string;
  phase: GamePhase;
  timerSetting: TimerSetting;
  dictionaryId: string;
  activeSlot: PlayerSlot | null;
  turnStartedAt: string | null;
  turnDeadlineAt: string | null;
  serverNow: string;
  bagRemaining: number;
  consecutiveScoreless: number;
  pendingChallenge: PendingChallenge | null;
  board: Board;
  history: CommittedMove[];
  players: Array<{
    slot: PlayerSlot;
    userId: string;
    displayName: string;
    score: number;
    rackCount: number;
    isHost: boolean;
    forfeitNext: boolean;
    connected: boolean;
    lastSeenAt: string | null;
  }>;
  myRack: Rack | null;
  result: GameResult | null;
};

export type GameSummary = {
  id: string;
  phase: GamePhase;
  endedAt: string | null;
  result: GameResult | null;
  opponents: Array<{ userId: string; displayName: string; score: number }>;
};

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const err = (error: ActionError): ActionResult<never> => ({ ok: false, error });
