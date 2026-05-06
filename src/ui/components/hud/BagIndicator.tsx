'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui/components/ui/tooltip';

export type BagIndicatorProps = {
  tilesInBag: number;
  className?: string;
};

export function BagIndicator({ tilesInBag, className }: BagIndicatorProps) {
  const lowBag = tilesInBag <= 7;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-testid="bag-indicator"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-board-base/70 px-2.5 py-1 text-[12px] font-medium ring-1 ring-tile-ink/10 transition-colors',
              lowBag ? 'text-premium-tw' : 'text-tile-ink/80',
              className,
            )}
          >
            <BagGlyph
              className={cn('h-3.5 w-3.5', lowBag ? 'text-premium-tw' : 'text-tile-edge')}
            />
            <span className="tabular-nums font-display font-semibold">{tilesInBag}</span>
            <span className="text-tile-ink/55">tiles</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Tiles remaining in the bag — when empty, the endgame begins.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BagGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4 L5 3 a1.5 1.5 0 0 1 3 0 L8 4" />
      <path d="M3.5 4 L12.5 4 L13.5 13 a1 1 0 0 1 -1 1 L3.5 14 a1 1 0 0 1 -1 -1 Z" />
    </svg>
  );
}

export default BagIndicator;
