import Link from 'next/link';

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-tile-edge">Scrabble-style, online</p>
        <h1 className="text-5xl font-semibold leading-tight">
          Two friends. <br />
          One real board.
        </h1>
        <p className="text-lg text-tile-ink/80">
          Authentic rules, server-authoritative state, and real-time multiplayer — built to be
          played, not just demoed.
        </p>
      </header>

      <Link
        href="/sign-in"
        className="rounded-md bg-tile-edge px-6 py-3 text-tile-face shadow-sm transition hover:bg-tile-ink"
      >
        Sign in to play
      </Link>
    </main>
  );
}
