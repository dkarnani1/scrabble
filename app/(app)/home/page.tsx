import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { DisplayNamePrompt } from '@ui/components/auth/DisplayNamePrompt';
import { getCurrentUser } from '@auth/server';
import { getProfile } from '@persistence/profiles.repo';
import { listMyGames } from '@/app/actions/games';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/home');

  const profile = await getProfile(user.id);

  if (!profile) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md space-y-4 py-8">
          <header>
            <h1 className="text-2xl font-semibold">Welcome to Scrabble</h1>
            <p className="text-sm text-tile-ink/70">Pick a display name your opponents will see.</p>
          </header>
          <DisplayNamePrompt />
        </section>
      </AppShell>
    );
  }

  const list = await listMyGames();
  const active = list.ok ? list.data.active : [];

  return (
    <AppShell rightSlot={<span className="text-sm text-tile-ink/80">{profile.display_name}</span>}>
      <section className="space-y-6 py-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Your games</h1>
          <Link
            href="/games/new"
            className="inline-flex items-center rounded-md bg-tile-edge px-4 py-2 text-sm font-medium text-tile-face transition hover:bg-tile-ink"
          >
            New game
          </Link>
        </header>

        {active.length === 0 ? (
          <p className="rounded-md border border-dashed border-board-line bg-board-base/40 px-4 py-8 text-center text-sm text-tile-ink/70">
            No active games yet.
            <br />
            Start a new game and invite a friend.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((g) => {
              const opponent = g.players.find((p) => p.userId !== user.id);
              const me = g.players.find((p) => p.userId === user.id);
              const isMyTurn = g.activeSlot != null && me?.slot === g.activeSlot;
              const target = g.phase === 'lobby' ? `/games/${g.id}/lobby` : `/games/${g.id}/play`;
              return (
                <li key={g.id}>
                  <Link
                    href={target}
                    className="flex items-center justify-between rounded-md border border-board-line bg-board-base/60 px-4 py-3 hover:bg-board-line/30"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">vs {opponent?.displayName ?? 'waiting…'}</span>
                      <span className="text-xs text-tile-ink/60">
                        {g.phase === 'lobby'
                          ? 'Lobby'
                          : g.phase === 'playing'
                            ? isMyTurn
                              ? 'Your turn'
                              : 'Their turn'
                            : g.phase}
                      </span>
                    </span>
                    <span className="text-xs text-tile-edge">Open →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-md border border-board-line bg-board-base/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tile-edge">Settings</h2>
        <p className="mt-1 text-sm text-tile-ink/80">
          Display name: <strong>{profile.display_name}</strong>{' '}
          <Link href="/profile" className="ml-2 text-xs text-tile-edge underline">
            edit
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
