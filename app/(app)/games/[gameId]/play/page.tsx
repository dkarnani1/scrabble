import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@ui/components/shell/AppShell';
import { getCurrentUser } from '@auth/server';
import { getGameView } from '@/app/actions/games';
import { PlayClient } from './PlayClient';

export const dynamic = 'force-dynamic';

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/games/${gameId}/play`);

  const result = await getGameView({ gameId });
  if (!result.ok) {
    if (result.error.code === 'not-found') notFound();
    redirect('/home');
  }
  const view = result.data;

  if (view.phase === 'lobby') {
    redirect(`/games/${gameId}/lobby`);
  }
  if (view.phase === 'completed' || view.phase === 'abandoned') {
    redirect(`/games/${gameId}/result`);
  }

  return (
    <AppShell>
      <PlayClient initialView={view} myUserId={user.id} />
    </AppShell>
  );
}
