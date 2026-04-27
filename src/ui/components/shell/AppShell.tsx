import Link from 'next/link';
import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export function AppShell({
  children,
  rightSlot,
  className,
}: {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-h-screen bg-board-base text-tile-ink', className)}>
      <header className="sticky top-0 z-10 border-b border-board-line bg-board-base/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/home" className="text-base font-semibold tracking-tight text-tile-edge">
            Scrabble
          </Link>
          <div className="flex items-center gap-3 text-sm">{rightSlot}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
