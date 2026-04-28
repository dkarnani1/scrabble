'use server';

// Server Actions for in-game moves: placeMove, passTurn, exchangeTiles. Each runs the
// full read-validate-write cycle through the orchestration layer.

import { z } from 'zod';
import { getCurrentUser } from '@auth/server';
import { commitAction, loadGameStateForCaller } from '@orchestration/game-engine';
import { resolveIfExpired } from '@orchestration/timers';
import { err, ok, type ActionError, type ActionResult, type GameView } from './types';
import { loadGameView } from './_helpers';
import type { PlacementError } from '@rules/placement';
import type { PlacementCell } from '@rules/types';

// ---- Shared schema fragments -----------------------------------------------------

const coord = z.object({
  r: z.number().int().min(0).max(14),
  c: z.number().int().min(0).max(14),
});

const tileSchema = z.union([
  z.object({
    kind: z.literal('letter'),
    letter: z
      .string()
      .length(1)
      .regex(/^[A-Z]$/),
    value: z.number().int().min(0).max(20),
  }),
  z.object({
    kind: z.literal('blank'),
    assigned: z
      .union([
        z
          .string()
          .length(1)
          .regex(/^[A-Z]$/),
        z.null(),
      ])
      .optional()
      .transform((v) => v ?? null),
    value: z.literal(0),
  }),
]);

const placementCellSchema = z.object({
  coord,
  tile: tileSchema,
});

// ---- placeMove ------------------------------------------------------------------

const placeMoveSchema = z.object({
  gameId: z.string().uuid(),
  tiles: z.array(placementCellSchema).min(1).max(7),
});

export async function placeMove(
  input: z.input<typeof placeMoveSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = placeMoveSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  // Preflight: resolve any expired turn deadline before doing per-action work.
  await resolveIfExpired(parsed.data.gameId, new Date());

  // Load to confirm the caller is the active player; the orchestrator re-checks too.
  const loaded = await loadGameStateForCaller(parsed.data.gameId, user.id);
  if (!loaded) return err({ code: 'not-found', entity: 'game' });
  if (loaded.callerSlot === null) return err({ code: 'forbidden', reason: 'not-a-participant' });
  if (loaded.state.activeSlot !== loaded.callerSlot) {
    return err({ code: 'state-conflict', reason: 'not-your-turn' });
  }

  const result = await commitAction({
    gameId: parsed.data.gameId,
    callerUserId: user.id,
    action: {
      kind: 'place',
      playerSlot: loaded.callerSlot,
      // The Zod schema validates letter as /^[A-Z]$/ so the runtime guarantee equals
      // the Letter type; the cast bridges the structural-typing gap.
      tiles: parsed.data.tiles as unknown as PlacementCell[],
    },
  });

  if (!result.ok) return err(translateEngineError(result.error));

  const view = await loadGameView({ gameId: parsed.data.gameId, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// ---- passTurn -------------------------------------------------------------------

const passTurnSchema = z.object({ gameId: z.string().uuid() });

export async function passTurn(
  input: z.input<typeof passTurnSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = passTurnSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  await resolveIfExpired(parsed.data.gameId, new Date());

  const loaded = await loadGameStateForCaller(parsed.data.gameId, user.id);
  if (!loaded) return err({ code: 'not-found', entity: 'game' });
  if (loaded.callerSlot === null) return err({ code: 'forbidden', reason: 'not-a-participant' });
  if (loaded.state.activeSlot !== loaded.callerSlot) {
    return err({ code: 'state-conflict', reason: 'not-your-turn' });
  }

  const result = await commitAction({
    gameId: parsed.data.gameId,
    callerUserId: user.id,
    action: { kind: 'pass', playerSlot: loaded.callerSlot, reason: 'voluntary' },
  });
  if (!result.ok) return err(translateEngineError(result.error));

  const view = await loadGameView({ gameId: parsed.data.gameId, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// ---- exchangeTiles --------------------------------------------------------------

const exchangeSchema = z.object({
  gameId: z.string().uuid(),
  tileIndices: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

export async function exchangeTiles(
  input: z.input<typeof exchangeSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = exchangeSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  await resolveIfExpired(parsed.data.gameId, new Date());

  const loaded = await loadGameStateForCaller(parsed.data.gameId, user.id);
  if (!loaded) return err({ code: 'not-found', entity: 'game' });
  if (loaded.callerSlot === null) return err({ code: 'forbidden', reason: 'not-a-participant' });
  if (loaded.state.activeSlot !== loaded.callerSlot) {
    return err({ code: 'state-conflict', reason: 'not-your-turn' });
  }

  const result = await commitAction({
    gameId: parsed.data.gameId,
    callerUserId: user.id,
    action: {
      kind: 'exchange',
      playerSlot: loaded.callerSlot,
      indices: parsed.data.tileIndices,
    },
  });
  if (!result.ok) return err(translateEngineError(result.error));

  const view = await loadGameView({ gameId: parsed.data.gameId, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// ---- helpers --------------------------------------------------------------------

function zodToError(error: z.ZodError): ActionError {
  return {
    code: 'invalid-input',
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}

function translateEngineError(
  e:
    | { kind: 'not-found' }
    | { kind: 'state-conflict'; reason: string }
    | { kind: 'rule-violation'; reason: string },
): ActionError {
  if (e.kind === 'not-found') return { code: 'not-found', entity: 'game' };
  if (e.kind === 'state-conflict') {
    if (e.reason === 'not-your-turn') return { code: 'state-conflict', reason: 'not-your-turn' };
    if (e.reason === 'wrong-game-phase')
      return { code: 'state-conflict', reason: 'wrong-game-phase' };
    if (e.reason === 'seq-conflict')
      return { code: 'state-conflict', reason: 'turn-already-resolved' };
    return { code: 'state-conflict', reason: 'wrong-game-phase' };
  }
  // rule-violation: map to the contract's enum.
  const PLACEMENT_REASONS: PlacementError[] = [
    'first-move-must-cover-center',
    'tiles-not-in-single-line',
    'tiles-not-contiguous',
    'not-connected-to-existing-tiles',
    'no-tiles-placed',
    'tile-not-on-rack',
    'blank-not-assigned',
    'square-already-occupied',
    'word-shorter-than-two',
  ];
  if ((PLACEMENT_REASONS as string[]).includes(e.reason)) {
    return { code: 'rule-violation', reason: e.reason as PlacementError };
  }
  if (e.reason === 'exchange-bag-too-small') {
    return { code: 'rule-violation', reason: 'exchange-bag-too-small' };
  }
  // word-not-in-dictionary is a P5 / challenge-resolution path; fall back to a
  // generic rule-violation for now so Phase 4 ships.
  return { code: 'rule-violation', reason: 'word-shorter-than-two' };
}
