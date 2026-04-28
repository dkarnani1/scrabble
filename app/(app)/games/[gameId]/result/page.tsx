import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { EndgameBanner } from '@ui/components/feedback/EndgameBanner';
import { RematchButton } from '@ui/components/result/RematchButton';
import { MoveHistoryList } from '@ui/components/moves/MoveHistoryList';
import { getCurrentUser } from '@auth/server';
import { getGameView } from '@/app/actions/games';
import type { PlayerSlot } from '@rules/types';

export const dynamic = 'force-dynamic';

export default async function ResultPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/games/${gameId}/result`);

  const result = await getGameView({ gameId });
  if (!result.ok) {
    if (result.error.code === 'not-found') notFound();
    redirect('/home');
  }
  const view = result.data;

  if (view.phase === 'lobby') redirect(`/games/${gameId}/lobby`);
  if (view.phase === 'playing' || view.phase === 'challenge-window') {
    redirect(`/games/${gameId}/play`);
  }

  if (!view.result) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md py-8 text-center">
          <h1 className="text-2xl font-semibold">Result unavailable</h1>
          <p className="text-sm text-tile-ink/70">This game has not yet completed scoring.</p>
          <Link href="/home" className="mt-4 inline-block text-sm text-tile-edge underline">
            Back to home
          </Link>
        </section>
      </AppShell>
    );
  }

  const me = view.players.find((p) => p.userId === user.id);
  const mySlot: PlayerSlot | null = (me?.slot ?? null) as PlayerSlot | null;
  const amHost = me?.isHost ?? false;

  const displayNameBySlot: Partial<Record<PlayerSlot, string>> = {};
  for (const p of view.players) displayNameBySlot[p.slot] = p.displayName;

  const sortedPlayers = view.players.slice().sort((a, b) => b.score - a.score);

  return (
    <AppShell>
      <div className="grid gap-6 py-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <Link href="/home" className="text-sm text-tile-edge underline">
            ← Back to your games
          </Link>

          <EndgameBanner
            result={view.result}
            mySlot={mySlot}
            displayNameBySlot={displayNameBySlot}
          />

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
              Final scores
            </h2>
            <ul className="space-y-1">
              {sortedPlayers.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center justify-between rounded-md border border-board-line bg-board-base/60 px-4 py-2"
                >
                  <span className="font-medium">{p.displayName}</span>
                  <span className="font-mono text-base">{p.score}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
              Up next
            </h2>
            <RematchButton priorGameId={view.id} amHost={amHost} />
          </section>
        </section>

        <aside>
          <MoveHistoryList history={view.history} displayNameBySlot={displayNameBySlot} />
        </aside>
      </div>
    </AppShell>
  );
}
