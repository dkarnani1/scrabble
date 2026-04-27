// DTO adapters: shape conversion between Supabase row representations and the
// framework-free domain types in src/rules/types. The persistence layer knows about both
// shapes; the rules engine only knows about domain types.

import type {
  Board,
  CommittedMove,
  GamePhase,
  GameResult,
  GameState,
  PendingChallenge,
  PlacedTile,
  PlayerSlot,
  PlayerState,
  TimerSetting,
} from '@rules/types';
import { PREMIUM_LAYOUT } from '@rules/board';

// ---- Row shapes (mirror what Supabase returns) -------------------------------------

export type GameRow = {
  id: string;
  phase: GamePhase;
  host_user_id: string;
  timer_setting: TimerSetting;
  dictionary_id: string;
  board_state: ReadonlyArray<ReadonlyArray<PlacedTile | null>>;
  bag_count: number;
  active_slot: PlayerSlot | null;
  turn_started_at: string | null;
  turn_deadline_at: string | null;
  consecutive_scoreless: number;
  pending_challenge: PendingChallenge | null;
  rng_seed: string;
  created_at: string;
  ended_at: string | null;
  result: GameResult | null;
};

export type PlayerRow = {
  game_id: string;
  slot: PlayerSlot;
  user_id: string;
  is_host: boolean;
  score: number;
  rack_count: number;
  forfeit_next: boolean;
  connected: boolean;
  last_seen_at: string | null;
  joined_at: string;
};

export type MoveRow = {
  game_id: string;
  seq: number;
  player_slot: PlayerSlot;
  kind: 'place' | 'pass' | 'exchange';
  payload: unknown;
  score: number;
  words: string[];
  is_bingo: boolean;
  pass_reason: 'voluntary' | 'forced-timeout' | null;
  challenge_outcome: CommittedMove['challenge'];
  created_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
};

// ---- Adapters ----------------------------------------------------------------------

export function rowToBoard(boardState: GameRow['board_state']): Board {
  return { cells: boardState, premiums: PREMIUM_LAYOUT };
}

export function rowToPlayerState(row: PlayerRow, profile: ProfileRow): PlayerState {
  return {
    slot: row.slot,
    userId: row.user_id,
    displayName: profile.display_name,
    score: row.score,
    rackSize: row.rack_count,
    isHost: row.is_host,
    hasForfeitedNextTurn: row.forfeit_next,
    connected: row.connected,
    lastSeenAt: row.last_seen_at,
  };
}

export function rowsToCommittedMove(row: MoveRow): CommittedMove {
  if (row.kind === 'place') {
    return {
      move: {
        kind: 'place',
        seq: row.seq,
        playerSlot: row.player_slot,
        tiles: (row.payload as { tiles: CommittedMove['move'] extends { tiles: infer T } ? T : never })?.tiles ?? [],
        score: row.score,
        words: row.words,
        isBingo: row.is_bingo,
        createdAt: row.created_at,
      } as CommittedMove['move'],
      challenge: row.challenge_outcome,
    };
  }
  if (row.kind === 'pass') {
    return {
      move: {
        kind: 'pass',
        seq: row.seq,
        playerSlot: row.player_slot,
        reason: row.pass_reason ?? 'voluntary',
        createdAt: row.created_at,
      },
      challenge: row.challenge_outcome,
    };
  }
  return {
    move: {
      kind: 'exchange',
      seq: row.seq,
      playerSlot: row.player_slot,
      count: (row.payload as { count?: number })?.count ?? 0,
      createdAt: row.created_at,
    },
    challenge: row.challenge_outcome,
  };
}

export function rowsToGameState(args: {
  game: GameRow;
  players: PlayerRow[];
  profiles: ProfileRow[];
  moves: MoveRow[];
}): GameState {
  const profileById = new Map(args.profiles.map((p) => [p.id, p]));
  const players: PlayerState[] = args.players
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => {
      const profile = profileById.get(p.user_id);
      if (!profile) {
        throw new Error(`Missing profile for user ${p.user_id} (game ${p.game_id})`);
      }
      return rowToPlayerState(p, profile);
    });

  const history: CommittedMove[] = args.moves
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map(rowsToCommittedMove);

  return {
    id: args.game.id,
    phase: args.game.phase,
    players,
    activeSlot: args.game.active_slot,
    turnStartedAt: args.game.turn_started_at,
    turnDeadlineAt: args.game.turn_deadline_at,
    timerSetting: args.game.timer_setting,
    bagRemaining: args.game.bag_count,
    board: rowToBoard(args.game.board_state),
    history,
    consecutiveScorelessTurns: args.game.consecutive_scoreless,
    pendingChallenge: args.game.pending_challenge,
    dictionaryId: args.game.dictionary_id,
    rngSeed: args.game.rng_seed,
    createdAt: args.game.created_at,
    endedAt: args.game.ended_at,
    result: args.game.result,
  };
}
