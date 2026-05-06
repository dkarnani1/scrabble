'use client';

import Link from 'next/link';
import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import { BrandMark } from './BrandMark';
import { HeaderPresence, type HeaderPresencePlayer } from './HeaderPresence';
import { CommandPaletteHint } from './CommandPaletteHint';
import { SoundToggle } from '@ui/components/hud/SoundToggle';

type AppShellHeaderState = {
  presence: ReadonlyArray<HeaderPresencePlayer>;
  /** Optional center-slot crumbs (e.g. "Game vs Jordan"). */
  centerLabel: string | null;
  /**
   * When true, renders an extra hairline under the header that visually
   * "seams" the chrome onto the felt board below. Used on the play page.
   */
  hasFeltSeam: boolean;
};

type AppShellHeaderApi = AppShellHeaderState & {
  setPresence: (next: ReadonlyArray<HeaderPresencePlayer>) => void;
  setCenterLabel: (next: string | null) => void;
  setFeltSeam: (next: boolean) => void;
};

const AppShellHeaderContext = React.createContext<AppShellHeaderApi | null>(null);

/**
 * Lets a deeply nested page (e.g. PlayClient) push presence + breadcrumb data
 * into the shared AppShell header without restructuring layouts. Pages call
 * the setters in a `useEffect` and clean up on unmount.
 */
export function useAppShellHeader(): AppShellHeaderApi {
  const ctx = React.useContext(AppShellHeaderContext);
  if (!ctx) {
    // Tolerate use-outside-shell so demo / error pages don't crash.
    return {
      presence: [],
      centerLabel: null,
      hasFeltSeam: false,
      setPresence: () => {},
      setCenterLabel: () => {},
      setFeltSeam: () => {},
    };
  }
  return ctx;
}

export function AppShell({
  children,
  rightSlot,
  className,
}: {
  children: React.ReactNode;
  /** Legacy slot for inline status copy (e.g. profile name on home). */
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  const [presence, setPresence] = React.useState<ReadonlyArray<HeaderPresencePlayer>>([]);
  const [centerLabel, setCenterLabel] = React.useState<string | null>(null);
  const [hasFeltSeam, setFeltSeam] = React.useState<boolean>(false);

  const api = React.useMemo<AppShellHeaderApi>(
    () => ({ presence, centerLabel, hasFeltSeam, setPresence, setCenterLabel, setFeltSeam }),
    [presence, centerLabel, hasFeltSeam],
  );

  return (
    <AppShellHeaderContext.Provider value={api}>
      <div className={cn('relative min-h-screen bg-board-base text-tile-ink', className)}>
        <header
          className={cn(
            // Glass + ring for the new chrome. Drop the old border in favor of a
            // softer hairline so the surface reads as a translucent pane.
            'sticky top-0 z-40 backdrop-blur-xl bg-board-base/70 ring-1 ring-tile-ink/10',
            // Felt seam: a darker hairline under the header so it "attaches"
            // to the board below on play pages.
            hasFeltSeam &&
              'before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-tile-ink/15',
          )}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link
              href="/home"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-2 focus-visible:ring-offset-board-base"
            >
              <BrandMark />
            </Link>

            {centerLabel && (
              <p className="hidden truncate text-xs text-tile-ink/65 sm:block">{centerLabel}</p>
            )}

            <div className="flex items-center gap-2 text-sm">
              {presence.length > 0 && <HeaderPresence players={presence} />}
              <CommandPaletteHint />
              <SoundToggle />
              {rightSlot}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </AppShellHeaderContext.Provider>
  );
}
