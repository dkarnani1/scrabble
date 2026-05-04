import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { DisplayNamePrompt } from '@ui/components/auth/DisplayNamePrompt';
import { InProgressList } from '@ui/components/home/InProgressList';
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

        <InProgressList games={active} myUserId={user.id} />
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
