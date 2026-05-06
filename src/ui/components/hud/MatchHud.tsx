'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import { PlayerCard } from './PlayerCard';
import { TurnTimerRing } from './TurnTimerRing';
import { BagIndicator } from './BagIndicator';
import { SoundToggle } from './SoundToggle';

export type MatchHudPlayer = {
  name: string;
  score: number;
  isPresent: boolean;
  isActive: boolean;
  lastDelta?: number;
};

export type MatchHudProps = {
  you: MatchHudPlayer;
  opponent: MatchHudPlayer;
  timer: { secondsRemaining: number; secondsTotal: number; active: boolean };
  tilesInBag: number;
  className?: string;
};

export function MatchHud({ you, opponent, timer, tilesInBag, className }: MatchHudProps) {
  return (
    <div
      data-testid="match-hud"
      className={cn(
        'rounded-xl bg-board-base/85 px-4 py-3 ring-1 ring-tile-ink/10 shadow-board-deep backdrop-blur-md',
        className,
      )}
    >
      {/* Mobile: two stacked rows */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <PlayerCard
            name={you.name}
            score={you.score}
            isYou
            isActive={you.isActive}
            isPresent={you.isPresent}
            {...(you.lastDelta !== undefined ? { lastDelta: you.lastDelta } : {})}
            align="left"
          />
          <TurnTimerRing
            secondsRemaining={timer.secondsRemaining}
            secondsTotal={timer.secondsTotal}
            active={timer.active}
            size={48}
            strokeWidth={4}
          />
          <PlayerCard
            name={opponent.name}
            score={opponent.score}
            isYou={false}
            isActive={opponent.isActive}
            isPresent={opponent.isPresent}
            {...(opponent.lastDelta !== undefined ? { lastDelta: opponent.lastDelta } : {})}
            align="right"
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <BagIndicator tilesInBag={tilesInBag} />
          <SoundToggle />
        </div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden items-center gap-4 sm:flex">
        <div className="flex-1 min-w-0">
          <PlayerCard
            name={you.name}
            score={you.score}
            isYou
            isActive={you.isActive}
            isPresent={you.isPresent}
            {...(you.lastDelta !== undefined ? { lastDelta: you.lastDelta } : {})}
            align="left"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <TurnTimerRing
            secondsRemaining={timer.secondsRemaining}
            secondsTotal={timer.secondsTotal}
            active={timer.active}
          />
          <div className="flex items-center gap-2">
            <BagIndicator tilesInBag={tilesInBag} />
            <SoundToggle />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex justify-end">
          <PlayerCard
            name={opponent.name}
            score={opponent.score}
            isYou={false}
            isActive={opponent.isActive}
            isPresent={opponent.isPresent}
            {...(opponent.lastDelta !== undefined ? { lastDelta: opponent.lastDelta } : {})}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}

export default MatchHud;
