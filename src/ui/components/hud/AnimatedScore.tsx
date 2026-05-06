'use client';

import * as React from 'react';
import { animate, useMotionValue, useTransform, motion, useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';

export type AnimatedScoreProps = {
  value: number;
  className?: string;
  durationMs?: number;
};

const PULSE_MS = 400;

export function AnimatedScore({ value, className, durationMs = 700 }: AnimatedScoreProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toString());
  const prevRef = React.useRef(value);
  const [pulsing, setPulsing] = React.useState(false);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    const prev = prevRef.current;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      motionValue.set(value);
      prevRef.current = value;
      return;
    }
    if (value === prev) return;

    if (reduceMotion) {
      motionValue.set(value);
    } else {
      const controls = animate(motionValue, value, {
        duration: durationMs / 1000,
        ease: [0.22, 1, 0.36, 1],
      });
      if (value > prev) {
        setPulsing(true);
        const t = window.setTimeout(() => setPulsing(false), PULSE_MS);
        prevRef.current = value;
        return () => {
          controls.stop();
          window.clearTimeout(t);
        };
      }
      prevRef.current = value;
      return () => controls.stop();
    }
    prevRef.current = value;
  }, [value, durationMs, motionValue, reduceMotion]);

  if (reduceMotion) {
    return (
      <span className={cn('font-display font-semibold tabular-nums', className)}>
        {Math.round(value)}
      </span>
    );
  }

  return (
    <motion.span
      className={cn(
        'inline-block font-display font-semibold tabular-nums transition-colors duration-200',
        pulsing && 'text-tile-edge',
        className,
      )}
      animate={pulsing ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: PULSE_MS / 1000, ease: 'easeOut' }}
    >
      <motion.span>{rounded}</motion.span>
    </motion.span>
  );
}

export default AnimatedScore;
