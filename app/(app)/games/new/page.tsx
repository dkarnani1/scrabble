import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { getCurrentUser } from '@auth/server';
import { NewGameForm } from './NewGameForm';

export const dynamic = 'force-dynamic';

export default async function NewGamePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/games/new');

  return (
    <AppShell>
      <section className="mx-auto max-w-md space-y-6 py-4">
        <header>
          <h1 className="text-2xl font-semibold">Create a game</h1>
          <p className="text-sm text-tile-ink/70">
            Pick a turn timer and a dictionary. We'll generate a single-use invite link to share
            with one friend.
          </p>
        </header>

        <NewGameForm />

        <Link href="/home" className="block text-sm text-tile-edge underline">
          Back to home
        </Link>
      </section>
    </AppShell>
  );
}
