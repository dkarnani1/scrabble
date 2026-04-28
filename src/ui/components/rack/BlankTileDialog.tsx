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
import type { Letter } from '@rules/types';

const LETTERS: Letter[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

export type BlankTileDialogProps = {
  open: boolean;
  onClose: () => void;
  onAssign: (letter: Letter) => void;
};

export function BlankTileDialog({ open, onClose, onAssign }: BlankTileDialogProps) {
  const [pick, setPick] = React.useState<Letter | null>(null);

  React.useEffect(() => {
    if (!open) setPick(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent>
        <DialogTitle>Assign letter to blank</DialogTitle>
        <DialogDescription>
          Pick which letter this blank tile should represent for the duration of the game.
        </DialogDescription>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {LETTERS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPick(l)}
              className={`flex h-10 items-center justify-center rounded-md border ${
                pick === l
                  ? 'border-tile-edge bg-tile-edge/10'
                  : 'border-board-line bg-board-base/40'
              } font-semibold`}
            >
              {l}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!pick} onClick={() => pick && onAssign(pick)}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
