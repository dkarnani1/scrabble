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

export type PassButtonProps = {
  onConfirm: () => void;
  disabled?: boolean;
  pending?: boolean;
};

export function PassButton({ onConfirm, disabled, pending }: PassButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled || pending}
      >
        Pass
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Pass your turn?</DialogTitle>
          <DialogDescription>
            Passing scores zero this turn and may bring the game closer to a six-pass termination.
          </DialogDescription>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Confirm pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
