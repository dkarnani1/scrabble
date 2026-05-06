import * as React from 'react';

import { cn } from '@ui/lib/classnames';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-board-line bg-board-base/40 px-3 py-1 text-sm text-tile-ink transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-tile-ink placeholder:text-tile-ink/50 focus-visible:border-tile-edge focus-visible:ring-2 focus-visible:ring-tile-edge/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-premium-tw aria-invalid:ring-2 aria-invalid:ring-premium-tw/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
