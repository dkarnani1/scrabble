'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';

// Minimal Dialog primitive shaped like the shadcn API surface. Implemented natively on
// the platform <dialog> element so it works without a Radix dependency at this stage.
// Replace with the shadcn-CLI-installed version once a UI design pass picks the
// dependency footprint.

type DialogContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo<DialogContextValue>(
    () => ({ open, setOpen: onOpenChange }),
    [open, onOpenChange],
  );
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

function useDialog(): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error('Dialog components must be inside <Dialog>.');
  return ctx;
}

export function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useDialog();
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      className={cn(
        'rounded-lg border border-board-line bg-board-base p-6 shadow-xl backdrop:bg-tile-ink/40',
        'max-w-lg w-full',
        className,
      )}
    >
      {children}
    </dialog>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold text-tile-ink', className)}>{children}</h2>;
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn('mt-1 text-sm text-tile-ink/80', className)}>{children}</p>;
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}
