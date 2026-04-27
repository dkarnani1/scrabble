import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  default: 'bg-tile-edge text-tile-face hover:bg-tile-ink',
  secondary: 'bg-board-line text-tile-ink hover:bg-board-line/80',
  outline: 'border border-board-line bg-transparent hover:bg-board-line/40',
  ghost: 'bg-transparent hover:bg-board-line/40',
  destructive: 'bg-premium-tw text-white hover:bg-premium-tw/90',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
});
