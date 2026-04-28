import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { getCurrentUser } from '@auth/server';
import { findInviteByCode } from '@persistence/invites.repo';
import { findPlayerByUser } from '@persistence/players.repo';
import { JoinForm } from './JoinForm';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: Promise<{ invite: string }> }) {
  const { invite } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=/games/join/${encodeURIComponent(invite)}`);
  }

  const inviteRow = await findInviteByCode(invite);

  if (!inviteRow) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md py-8 text-center">
          <h1 className="text-2xl font-semibold">Invite not found</h1>
          <p className="mt-2 text-sm text-tile-ink/70">
            This invite link is invalid. Ask the host for a new one.
          </p>
          <Link href="/home" className="mt-4 inline-block text-sm text-tile-edge underline">
            Back to home
          </Link>
        </section>
      </AppShell>
    );
  }

  // If the caller is already in the game, fast-path them straight to the lobby.
  const existing = await findPlayerByUser(inviteRow.game_id, user.id);
  if (existing) {
    redirect(`/games/${inviteRow.game_id}/lobby`);
  }

  if (inviteRow.consumed_at) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md py-8 text-center">
          <h1 className="text-2xl font-semibold">Invite already used</h1>
          <p className="mt-2 text-sm text-tile-ink/70">
            Someone else has already joined this game using this invite.
          </p>
          <Link href="/home" className="mt-4 inline-block text-sm text-tile-edge underline">
            Back to home
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-md space-y-4 py-8 text-center">
        <header>
          <h1 className="text-2xl font-semibold">Join this game?</h1>
          <p className="text-sm text-tile-ink/70">
            You've been invited to play. Confirm to take the second seat.
          </p>
        </header>
        <JoinForm inviteCode={invite} />
      </section>
    </AppShell>
  );
}
