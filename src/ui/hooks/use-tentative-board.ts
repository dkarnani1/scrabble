'use client';

// Local-only tentative-placement state. The server is the authority for committed
// state; this hook tracks the user's in-progress placements (tiles dragged from rack
// onto the board, blank assignments, recall-to-rack actions) BEFORE submission. On
// successful submission the hook resets; on rejection it preserves so the user can
// adjust.

import * as React from 'react';
import type { Letter, PlacementCell, Tile } from '@rules/types';

export type RackTileSlot = {
  tile: Tile;
  /** index in the original rack that came from the server */
  rackIndex: number;
  /** if placed on the board, the coord */
  placedAt: { r: number; c: number } | null;
  /** for blank tiles, the assigned letter while tentative */
  assignedLetter: Letter | null;
};

export type UseTentativeBoardArgs = {
  rack: ReadonlyArray<Tile>;
};

export type TentativeApi = {
  slots: RackTileSlot[];
  setSlots: React.Dispatch<React.SetStateAction<RackTileSlot[]>>;
  placeTile: (rackIndex: number, coord: { r: number; c: number }) => void;
  recallTile: (rackIndex: number) => void;
  recallAll: () => void;
  shuffleRack: () => void;
  assignBlank: (rackIndex: number, letter: Letter) => void;
  pendingPlacements: PlacementCell[];
};

export function useTentativeBoard({ rack }: UseTentativeBoardArgs): TentativeApi {
  // Identify the rack by content, not array identity. Periodic refetches hand
  // back a fresh array reference even when the letters haven't changed; using
  // the array as a dep would wipe in-progress tentative placements every tick.
  const rackKey = React.useMemo(
    () => rack.map((t) => (t.kind === 'letter' ? t.letter : `?${t.assigned ?? '_'}`)).join(','),
    [rack],
  );

  const rackRef = React.useRef(rack);
  rackRef.current = rack;

  // rackKey captures rack identity by content; rebuilding only when contents
  // change preserves placements across no-op refetches that hand in a fresh
  // array reference with the same letters.
  const initial = React.useMemo<RackTileSlot[]>(
    () =>
      rackRef.current.map((tile, rackIndex) => ({
        tile,
        rackIndex,
        placedAt: null,
        assignedLetter: tile.kind === 'blank' ? tile.assigned : null,
      })),
    [rackKey],
  );

  const [slots, setSlots] = React.useState<RackTileSlot[]>(initial);

  // Reset tentative state whenever the canonical rack changes (e.g. after a successful
  // submit refetched a fresh rack from the server).
  React.useEffect(() => {
    setSlots(initial);
  }, [initial]);

  const placeTile = React.useCallback((rackIndex: number, coord: { r: number; c: number }) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.rackIndex === rackIndex ? { ...slot, placedAt: coord } : slot)),
    );
  }, []);

  const recallTile = React.useCallback((rackIndex: number) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.rackIndex === rackIndex ? { ...slot, placedAt: null } : slot)),
    );
  }, []);

  const recallAll = React.useCallback(() => {
    setSlots((prev) => prev.map((slot) => ({ ...slot, placedAt: null })));
  }, []);

  const shuffleRack = React.useCallback(() => {
    setSlots((prev) => {
      const onRack = prev.filter((s) => s.placedAt === null);
      const placed = prev.filter((s) => s.placedAt !== null);
      const shuffled = onRack
        .map((s) => ({ s, k: Math.random() }))
        .sort((a, b) => a.k - b.k)
        .map(({ s }) => s);
      return [...placed, ...shuffled].sort((a, b) => a.rackIndex - b.rackIndex);
    });
  }, []);

  const assignBlank = React.useCallback((rackIndex: number, letter: Letter) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.rackIndex === rackIndex
          ? {
              ...slot,
              assignedLetter: letter,
              tile:
                slot.tile.kind === 'blank'
                  ? { kind: 'blank', assigned: letter, value: 0 }
                  : slot.tile,
            }
          : slot,
      ),
    );
  }, []);

  const pendingPlacements = React.useMemo<PlacementCell[]>(
    () =>
      slots
        .filter(
          (slot): slot is RackTileSlot & { placedAt: { r: number; c: number } } =>
            slot.placedAt !== null,
        )
        .map((slot) => ({ coord: slot.placedAt, tile: slot.tile })),
    [slots],
  );

  return {
    slots,
    setSlots,
    placeTile,
    recallTile,
    recallAll,
    shuffleRack,
    assignBlank,
    pendingPlacements,
  };
}
