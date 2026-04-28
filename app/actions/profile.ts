'use server';

// Server Action for the public profile (display name). T119.

import { z } from 'zod';
import { getCurrentUser } from '@auth/server';
import { getProfile, upsertDisplayName } from '@persistence/profiles.repo';
import { err, ok, type ActionResult } from './types';

const setDisplayNameSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters.')
    .max(32, 'Display name must be at most 32 characters.')
    .regex(
      /^[\p{L}\p{N} _.\-]+$/u,
      'Display name may contain letters, digits, spaces, underscores, dashes, and periods.',
    ),
});

export async function setDisplayName(
  input: z.input<typeof setDisplayNameSchema>,
): Promise<ActionResult<{ displayName: string }>> {
  const parsed = setDisplayNameSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'invalid-input',
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const row = await upsertDisplayName(user.id, parsed.data.displayName);
  return ok({ displayName: row.display_name });
}

export async function getMyProfile(): Promise<
  ActionResult<{ id: string; displayName: string | null }>
> {
  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });
  const row = await getProfile(user.id);
  return ok({ id: user.id, displayName: row?.display_name ?? null });
}
