'use client';

import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundContext } from '@ui/sound/SoundProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/components/ui/tooltip';
import { cn } from '@ui/lib/classnames';

export type SoundToggleProps = {
  className?: string;
};

export function SoundToggle({ className }: SoundToggleProps) {
  const { enabled, setEnabled } = useSoundContext();
  const Icon = enabled ? Volume2 : VolumeX;
  const label = enabled ? 'Sound effects on' : 'Sound effects off';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={enabled}
          onClick={() => setEnabled(!enabled)}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full bg-board-base/70 ring-1 ring-tile-ink/10',
            'text-tile-ink/80 transition-colors hover:text-tile-ink hover:ring-tile-ink/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-1',
            'focus-visible:ring-offset-board-base',
            className,
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
