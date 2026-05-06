'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type HeaderPresencePlayer = {
  name: string;
  isYou: boolean;
  isPresent: boolean;
};

export type HeaderPresenceProps = {
  players: ReadonlyArray<HeaderPresencePlayer>;
  className?: string;
};

/**
 * Compact overlapping avatar cluster for the AppShell header. Dots indicate
 * realtime presence (green = present, gray = away). Pure presentation — the
 * caller (PlayClient via the shell context) owns the data shape.
 */
export function HeaderPresence({ players, className }: HeaderPresenceProps) {
  if (players.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Player presence"
      className={cn('flex items-center -space-x-2', className)}
    >
      {players.map((p, i) => (
        <span
          key={`${i}:${p.name}`}
          title={`${p.name}${p.isYou ? ' (you)' : ''} — ${p.isPresent ? 'online' : 'away'}`}
          aria-label={`${p.name}${p.isYou ? ' you' : ''} ${p.isPresent ? 'online' : 'away'}`}
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-board-base',
            p.isYou ? 'bg-tile-edge text-board-base' : 'bg-tile-ink/15 text-tile-ink',
          )}
          style={{ zIndex: players.length - i }}
        >
          {initials(p.name)}
          <span
            aria-hidden
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-board-base',
              p.isPresent ? 'bg-emerald-500' : 'bg-tile-ink/35',
            )}
          />
        </span>
      ))}
    </div>
  );
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase());
  return parts.join('') || '?';
}
