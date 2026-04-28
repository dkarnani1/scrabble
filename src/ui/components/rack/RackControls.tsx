'use client';

import { Button } from '@ui/components/primitives';

export type RackControlsProps = {
  onShuffle: () => void;
  onRecallAll: () => void;
  hasTentativePlacements: boolean;
  disabled?: boolean;
};

export function RackControls({
  onShuffle,
  onRecallAll,
  hasTentativePlacements,
  disabled,
}: RackControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onShuffle} disabled={disabled}>
        Shuffle
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRecallAll}
        disabled={!hasTentativePlacements || disabled}
      >
        Recall
      </Button>
    </div>
  );
}
