import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { DisplayNamePrompt } from '@ui/components/auth/DisplayNamePrompt';
import { HomeBento } from '@ui/components/lobby/HomeBento';
import { getCurrentUser } from '@auth/server';
import { getProfile } from '@persistence/profiles.repo';
import { listMyGames } from '@/app/actions/games';
import {
  buildDemoHomeProps,
  isDemoHomeAllowed,
  type DemoMode,
} from '@ui/components/lobby/home-demo-fixtures';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const demoMode: DemoMode | null =
    isDemoHomeAllowed() && (params.demo === '1' || params.demo === 'empty')
      ? params.demo === 'empty'
        ? 'empty'
        : 'populated'
      : null;

  // Dev-only escape hatch: render the bento with mock data so screenshots /
  // local design iteration don't require a real authenticated session.
  if (demoMode) {
    const demoProps = buildDemoHomeProps(demoMode);
    return (
      <AppShell rightSlot={<span className="text-sm text-tile-ink/80">demo</span>}>
        <section className="space-y-6 py-4">
          {/* sr-only landmark heading so the page satisfies axe page-has-heading-one
              without competing with the bento's visible "Pick up where you left off". */}
          <h1 className="sr-only">Your games</h1>
          <HomeBento {...demoProps} />
        </section>
      </AppShell>
    );
  }

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
        <h1 className="sr-only">Your games</h1>
        <HomeBento
          myUserId={user.id}
          games={active}
          // `recent` is documented as not yet wired in `listMyGames` (returns [])
          // and stats aren't computed server-side. Pass null so the tiles render
          // the "Coming soon" treatment until those queries land.
          lastPlayed={null}
          stats={null}
        />
      </section>
    </AppShell>
  );
}
