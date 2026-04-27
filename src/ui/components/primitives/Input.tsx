import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-board-line bg-board-base/40 px-3',
        'text-sm text-tile-ink placeholder:text-tile-ink/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
});
