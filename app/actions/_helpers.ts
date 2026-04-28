// Internal helpers shared across Server Action files. Not exported as actions.
//
// `loadGameView` materializes a GameView for a given caller by reading games / players /
// profiles / moves and applying the same opponent-rack-stripping rule the client would
// see (FR-042). The caller's own rack is fetched from `game_secrets` via the service
// role; opponent racks are NEVER returned.

import { getGameById, getGameSecrets } from '@persistence/games.repo';
import { listPlayers } from '@persistence/players.repo';
import { getProfilesByIds } from '@persistence/profiles.repo';
import { getSupabaseAdminClient } from '@persistence/supabase-admin';
import { rowToBoard, type MoveRow, type PlayerRow, rowsToCommittedMove } from '@persistence/dto';
import type { GameView } from './types';
import type { PlayerSlot, Rack, Tile } from '@rules/types';

export async function loadGameView(args: {
  gameId: string;
  callerUserId: string;
}): Promise<GameView | null> {
  const game = await getGameById(args.gameId);
  if (!game) return null;
  const players = await listPlayers(args.gameId);
  const profiles = await getProfilesByIds(players.map((p) => p.user_id));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const movesRows = await getMoveRows(args.gameId);

  const callerSlot = players.find((p) => p.user_id === args.callerUserId)?.slot ?? null;

  const myRack = callerSlot !== null ? await readRackForSlot(args.gameId, callerSlot) : null;

  const view: GameView = {
    id: game.id,
    phase: game.phase,
    timerSetting: game.timer_setting,
    dictionaryId: game.dictionary_id,
    activeSlot: game.active_slot,
    turnStartedAt: game.turn_started_at,
    turnDeadlineAt: game.turn_deadline_at,
    serverNow: new Date().toISOString(),
    bagRemaining: game.bag_count,
    consecutiveScoreless: game.consecutive_scoreless,
    pendingChallenge: game.pending_challenge,
    board: rowToBoard(game.board_state),
    history: movesRows.map(rowsToCommittedMove),
    players: players
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({
        slot: p.slot,
        userId: p.user_id,
        displayName: profileById.get(p.user_id)?.display_name ?? 'Unknown',
        score: p.score,
        rackCount: p.rack_count,
        isHost: p.is_host,
        forfeitNext: p.forfeit_next,
        connected: p.connected,
      })),
    myRack,
    result: game.result,
  };
  return view;
}

async function getMoveRows(gameId: string): Promise<MoveRow[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('moves')
    .select('*')
    .eq('game_id', gameId)
    .order('seq', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MoveRow[];
}

async function readRackForSlot(gameId: string, slot: PlayerSlot): Promise<Rack | null> {
  const secrets = await getGameSecrets(gameId);
  if (!secrets) return null;
  const rack: Tile[] | null =
    slot === 0
      ? secrets.rack_slot_0
      : slot === 1
        ? secrets.rack_slot_1
        : slot === 2
          ? secrets.rack_slot_2
          : secrets.rack_slot_3;
  return rack ?? null;
}

export type CallerInfo = { userId: string; slot: PlayerSlot | null };

export async function getCallerSlot(gameId: string, userId: string): Promise<PlayerSlot | null> {
  const players = await listPlayers(gameId);
  return players.find((p) => p.user_id === userId)?.slot ?? null;
}

export function rowSlots(players: PlayerRow[]): PlayerSlot[] {
  return players.map((p) => p.slot).sort((a, b) => a - b);
}
