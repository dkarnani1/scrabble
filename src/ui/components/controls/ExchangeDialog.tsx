'use client';

import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@ui/components/primitives';
import { TileChip } from '@ui/components/rack/TileChip';
import type { Tile } from '@rules/types';

export type ExchangeDialogProps = {
  open: boolean;
  rack: ReadonlyArray<Tile>;
  bagRemaining: number;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (indices: number[]) => void;
};

export function ExchangeDialog({
  open,
  rack,
  bagRemaining,
  pending,
  onClose,
  onConfirm,
}: ExchangeDialogProps) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (!open) setSelected(new Set());
  }, [open]);

  const toggleIndex = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const allowExchange = bagRemaining >= 7;

  return (
    <Dialog open={open} onOpenChange={(n) => (!n ? onClose() : null)}>
      <DialogContent>
        <DialogTitle>Exchange tiles</DialogTitle>
        <DialogDescription>
          Pick 1–7 tiles to swap for fresh ones. Exchanging counts as a scoreless turn.
        </DialogDescription>
        {!allowExchange && (
          <p className="mt-3 rounded-md border border-premium-tw/30 bg-premium-tw/10 p-2 text-sm text-premium-tw">
            Exchange unavailable: only {bagRemaining} tile{bagRemaining === 1 ? '' : 's'} left in
            the bag (need at least 7).
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {rack.map((tile, i) => (
            <TileChip
              key={i}
              tile={tile}
              selected={selected.has(i)}
              disabled={!allowExchange}
              onClick={() => toggleIndex(i)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!allowExchange || selected.size === 0 || pending}
            onClick={() => onConfirm([...selected].sort((a, b) => a - b))}
          >
            {pending ? 'Exchanging…' : `Exchange ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
