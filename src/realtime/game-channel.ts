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

export type PresenceEvent =
  | { kind: 'presence-sync'; participants: ReadonlyArray<string> }
  | { kind: 'presence-join'; userId: string }
  | { kind: 'presence-leave'; userId: string };

export type SubscribeArgs = {
  gameId: string;
  onChange: (event: GameChangeEvent) => void;
  onStatusChange?: (status: 'subscribed' | 'reconnecting' | 'closed' | 'error') => void;
  /** When provided, the local user is "tracked" on the channel and presence events
   * fire on join/leave. The userId is what other clients see in `presence-join`. */
  presence?: { userId: string; onEvent: (event: PresenceEvent) => void };
};

export type Unsubscribe = () => Promise<void>;

export function subscribeToGame(args: SubscribeArgs): Unsubscribe {
  const sb = getSupabaseBrowserClient();
  const presenceConfig = args.presence ? { presence: { key: args.presence.userId } } : undefined;
  const channel = sb
    .channel(`game:${args.gameId}`, presenceConfig ? { config: presenceConfig } : undefined)
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
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        args.onStatusChange?.('subscribed');
        // Track this user's presence once we're subscribed.
        if (args.presence) {
          try {
            await channel.track({ userId: args.presence.userId, at: Date.now() });
          } catch {
            // Presence tracking is best-effort; ignore failures.
          }
        }
      } else if (status === 'CHANNEL_ERROR') args.onStatusChange?.('error');
      else if (status === 'TIMED_OUT' || status === 'CLOSED') args.onStatusChange?.('closed');
    });

  // Wire up presence handlers if requested.
  if (args.presence) {
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>;
      const participants = Object.keys(state);
      args.presence!.onEvent({ kind: 'presence-sync', participants });
    });
    channel.on('presence', { event: 'join' }, ({ key }) => {
      args.presence!.onEvent({ kind: 'presence-join', userId: String(key) });
    });
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      args.presence!.onEvent({ kind: 'presence-leave', userId: String(key) });
    });
  }

  return async () => {
    await sb.removeChannel(channel);
  };
}
