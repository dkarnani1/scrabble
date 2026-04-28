// Per-game realtime channel. Subscribes to Postgres Changes on `games` and `moves`
// scoped to a single game id. Returns an unsubscribe handle.
//
// The channel does NOT carry secret state — `game_secrets` is excluded from the
// publication at the database level. The browser client is publishable-key bound and
// subject to RLS (participant-only access on `games` and `moves`).

import { getSupabaseBrowserClient } from '@persistence/supabase-browser';

export type GameChangeEvent =
  | { kind: 'game-updated'; gameId: string; row: Record<string, unknown> }
  | { kind: 'move-inserted'; gameId: string; row: Record<string, unknown> }
  | { kind: 'players-updated'; gameId: string; row: Record<string, unknown> };

export type SubscribeArgs = {
  gameId: string;
  onChange: (event: GameChangeEvent) => void;
  onStatusChange?: (status: 'subscribed' | 'reconnecting' | 'closed' | 'error') => void;
};

export type Unsubscribe = () => Promise<void>;

export function subscribeToGame(args: SubscribeArgs): Unsubscribe {
  const sb = getSupabaseBrowserClient();
  const channel = sb
    .channel(`game:${args.gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${args.gameId}`,
      },
      (payload) => {
        args.onChange({
          kind: 'game-updated',
          gameId: args.gameId,
          row: payload.new as Record<string, unknown>,
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `game_id=eq.${args.gameId}`,
      },
      (payload) => {
        args.onChange({
          kind: 'move-inserted',
          gameId: args.gameId,
          row: payload.new as Record<string, unknown>,
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${args.gameId}`,
      },
      (payload) => {
        args.onChange({
          kind: 'players-updated',
          gameId: args.gameId,
          row: (payload.new as Record<string, unknown>) ?? (payload.old as Record<string, unknown>),
        });
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') args.onStatusChange?.('subscribed');
      else if (status === 'CHANNEL_ERROR') args.onStatusChange?.('error');
      else if (status === 'TIMED_OUT' || status === 'CLOSED') args.onStatusChange?.('closed');
    });

  return async () => {
    await sb.removeChannel(channel);
  };
}
