import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { DisplayNamePrompt } from '@ui/components/auth/DisplayNamePrompt';
import { getCurrentUser } from '@auth/server';
import { findInviteByCode } from '@persistence/invites.repo';
import { findPlayerByUser } from '@persistence/players.repo';
import { getProfile } from '@persistence/profiles.repo';
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

  // Invitees often arrive without a profile (sign-in flow skips the home-page
  // display-name step on its way back here). Without a name, they'd join the lobby
  // as "Unknown" and the host would see that. Force a name first.
  const profile = await getProfile(user.id);
  if (!profile?.display_name) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md space-y-4 py-8">
          <header className="text-center">
            <h1 className="text-2xl font-semibold">Pick a display name</h1>
            <p className="mt-2 text-sm text-tile-ink/70">
              Your opponent will see this name. You can change it later.
            </p>
          </header>
          <div className="flex justify-center">
            <DisplayNamePrompt redirectTo={`/games/join/${encodeURIComponent(invite)}`} />
          </div>
        </section>
      </AppShell>
    );
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
