'use client';

import * as React from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';

export type TurnTimerRingProps = {
  secondsRemaining: number;
  secondsTotal: number;
  active: boolean;
  size?: number;
  strokeWidth?: number;
};

export function TurnTimerRing({
  secondsRemaining,
  secondsTotal,
  active,
  size = 56,
  strokeWidth = 5,
}: TurnTimerRingProps) {
  const reduceMotion = useReducedMotion();

  const safeTotal = Math.max(secondsTotal, 1);
  const clamped = Math.max(0, Math.min(secondsRemaining, safeTotal));
  const ratio = clamped / safeTotal;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const isFinal = active && (secondsRemaining <= 10 || ratio < 0.2);
  const isCaution = active && !isFinal && ratio < 0.5;

  const strokeClass = !active
    ? 'stroke-tile-ink/25'
    : isFinal
      ? 'stroke-premium-tw'
      : isCaution
        ? 'stroke-premium-tl'
        : 'stroke-tile-edge';

  const labelText = active ? formatSeconds(clamped) : '—';
  const labelTone = !active
    ? 'text-tile-ink/40'
    : isFinal
      ? 'text-premium-tw'
      : isCaution
        ? 'text-premium-tl'
        : 'text-tile-ink';

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`${clamped} seconds remaining for ${active ? 'current' : 'opposing'} player`}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-tile-ink/15"
        />
        {isFinal && !reduceMotion && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth + 2}
            fill="none"
            className="stroke-premium-tw/40 animate-square-pulse"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn(strokeClass, 'transition-[stroke-dashoffset] duration-500 ease-linear')}
        />
      </svg>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center font-display text-[13px] font-semibold tabular-nums leading-none',
          labelTone,
        )}
      >
        {labelText}
      </span>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default TurnTimerRing;
