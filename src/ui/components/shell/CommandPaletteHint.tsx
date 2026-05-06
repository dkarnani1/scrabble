'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { useCommandPalette } from '@ui/components/shell/CommandPaletteProvider';
import { cn } from '@ui/lib/classnames';

export type CommandPaletteHintProps = {
  className?: string;
};

/**
 * Compact "⌘ K" hint button in the header. Detects platform once on mount so
 * Mac users see ⌘K and others see CtrlK; clicking opens the palette via the
 * provider context (same code path as the global keydown listener).
 */
export function CommandPaletteHint({ className }: CommandPaletteHintProps) {
  const { setOpen } = useCommandPalette();
  const [modifier, setModifier] = React.useState<'⌘' | 'Ctrl'>('Ctrl');

  React.useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
    setModifier(isMac ? '⌘' : 'Ctrl');
  }, []);

  return (
    <button
      type="button"
      aria-label="Open command palette"
      onClick={() => setOpen(true)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md bg-board-base/60 px-2 text-[11px] font-medium text-tile-ink/80 ring-1 ring-tile-ink/10 transition-colors',
        'hover:bg-tile-edge/10 hover:text-tile-ink hover:ring-tile-ink/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-1 focus-visible:ring-offset-board-base',
        className,
      )}
    >
      <Search className="h-3 w-3" aria-hidden />
      <span className="hidden sm:inline">Search</span>
      <kbd
        className="ml-0.5 rounded border border-tile-ink/15 bg-board-base/90 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-tile-ink/75"
        aria-hidden
      >
        {modifier} K
      </kbd>
    </button>
  );
}
