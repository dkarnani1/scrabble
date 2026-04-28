import Link from 'next/link';
import { SignInForm } from './SignInForm';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-tile-ink/70">
          We'll email you a one-tap magic link. No password required.
        </p>
      </header>

      <SignInForm next={params.next ?? '/home'} initialError={params.error ?? null} />

      <Link href="/" className="text-sm text-tile-edge underline">
        Back to home
      </Link>
    </main>
  );
}
