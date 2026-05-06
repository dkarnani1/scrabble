'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import { Rack, type RackProps } from './Rack';
import { cn } from '@ui/lib/classnames';

const SNAP_PEEK = 0.18 as const;
const SNAP_FULL = 0.42 as const;
const SNAP_POINTS: ReadonlyArray<number> = [SNAP_PEEK, SNAP_FULL];

export type RackSheetProps = RackProps;

/**
 * Mobile rack rendered as a vaul bottom sheet with two snap points (peek/full).
 * The drawer must be full viewport height so vaul's translateY math (which assumes
 * containerSize.height) lines up with what's actually visible — capping the height
 * (e.g. max-h-[60vh]) shifts the visible window off-screen. The visible strip is
 * controlled entirely by `--snap-point-height` (translateY), so content placed at
 * the top of the drawer renders inside the visible portion.
 */
export function RackSheet(props: RackSheetProps) {
  const [snap, setSnap] = React.useState<number | string | null>(SNAP_FULL);

  // When the count of tiles still on the rack drops (i.e., the player placed one),
  // collapse to the peek snap point so the board is more visible. We don't auto-grow
  // back when the count goes up (recall) — leave that to the user dragging the handle.
  const onRackCount = React.useMemo(
    () => props.slots.filter((s) => s.placedAt === null).length,
    [props.slots],
  );
  const prevCount = React.useRef<number>(onRackCount);
  React.useEffect(() => {
    if (onRackCount < prevCount.current) {
      setSnap(SNAP_PEEK);
    }
    prevCount.current = onRackCount;
  }, [onRackCount]);

  return (
    <Drawer.Root
      open
      dismissible={false}
      modal={false}
      shouldScaleBackground={false}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        <Drawer.Content
          aria-label="Tile rack"
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 flex h-full flex-col rounded-t-2xl',
            'bg-board-base/95 backdrop-blur-md ring-1 ring-tile-ink/10 shadow-board-deep',
            'outline-none',
          )}
        >
          <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-tile-ink/20" />
          <Drawer.Title className="sr-only">Your tile rack</Drawer.Title>
          <Drawer.Description className="sr-only">
            Drag the handle to expand or collapse the rack. Tiles inside can be dragged onto the
            board.
          </Drawer.Description>
          <div className="px-2 pb-3 pt-1">
            <Rack {...props} unstyled />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
