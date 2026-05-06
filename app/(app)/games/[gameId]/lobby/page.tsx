import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { LobbyView } from '@ui/components/lobby/LobbyView';
import { getCurrentUser } from '@auth/server';
import { getGameById } from '@persistence/games.repo';
import { findPlayerByUser, listPlayers } from '@persistence/players.repo';
import { getProfilesByIds } from '@persistence/profiles.repo';
import { getSupabaseAdminClient } from '@persistence/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/games/${gameId}/lobby`);

  const game = await getGameById(gameId);
  if (!game) notFound();

  const me = await findPlayerByUser(gameId, user.id);
  if (!me) {
    redirect('/home');
  }

  if (game.phase === 'playing' || game.phase === 'challenge-window') {
    redirect(`/games/${gameId}/play`);
  }
  if (game.phase === 'completed') {
    redirect(`/games/${gameId}/result`);
  }

  const playerRows = await listPlayers(gameId);
  const profiles = await getProfilesByIds(playerRows.map((p) => p.user_id));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const players = playerRows
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => ({
      slot: p.slot,
      userId: p.user_id,
      displayName: profileById.get(p.user_id)?.display_name ?? 'Unknown',
      isHost: p.is_host,
    }));

  // Look up the open invite (issued for the second player). Hosts use this; guests don't see it.
  let inviteCode: string | null = null;
  if (me.is_host) {
    const sb = getSupabaseAdminClient();
    const { data } = await sb
      .from('invites')
      .select('code')
      .eq('game_id', gameId)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    inviteCode = (data?.code as string | undefined) ?? null;
  }

  const baseUrl = await deriveBaseUrl();
  const inviteUrl = inviteCode ? `${baseUrl}/games/join/${inviteCode}` : null;

  return (
    <AppShell>
      <div className="py-4">
        <Link href="/home" className="mb-4 inline-block text-sm text-tile-edge underline">
          ← Back to your games
        </Link>
        <LobbyView
          gameId={gameId}
          inviteCode={inviteCode}
          inviteUrl={inviteUrl}
          players={players}
          amHost={me.is_host}
          myUserId={user.id}
          timerSetting={game.timer_setting}
          dictionaryId={game.dictionary_id}
        />
      </div>
    </AppShell>
  );
}

async function deriveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}
