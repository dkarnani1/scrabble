'use client';

export type RejectionInlineProps = {
  message: string | null;
};

const REASON_TO_PLAIN_LANGUAGE: Record<string, string> = {
  // Placement violations.
  'first-move-must-cover-center': 'Your first move must cover the center star.',
  'tiles-not-in-single-line': 'All placed tiles must lie in one row or one column.',
  'tiles-not-contiguous': 'Your placed tiles need to form a single contiguous run.',
  'not-connected-to-existing-tiles': 'New tiles must connect to a tile already on the board.',
  'no-tiles-placed': 'Place at least one tile before submitting.',
  'tile-not-on-rack': 'One of those tiles is not on your rack.',
  'blank-not-assigned': 'Pick a letter for the blank tile before submitting.',
  'square-already-occupied': 'You can’t place a tile on a square that already has one.',
  'exchange-bag-too-small': 'Not enough tiles left in the bag to exchange.',
  'word-shorter-than-two': 'Words must be at least two letters long.',
  'word-not-in-dictionary': 'One of those words isn’t in the dictionary.',
  // State conflicts.
  'not-your-turn': 'It’s not your turn.',
  'wrong-game-phase': 'This action is not available right now.',
  'challenge-window-closed': 'The challenge window has closed.',
  'challenge-already-raised': 'A challenge is already in progress.',
  'turn-already-resolved': 'Your opponent already moved — refresh to catch up.',
  'game-completed': 'This game has already ended.',
  // Auth / forbidden.
  unauthenticated: 'Please sign in to continue.',
  'not-a-participant': 'You’re not a player in this game.',
  'cannot-challenge-own-move': 'You can’t challenge your own move.',
};

export function reasonToMessage(reason: string): string {
  return REASON_TO_PLAIN_LANGUAGE[reason] ?? 'Move rejected.';
}

export function RejectionInline({ message }: RejectionInlineProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-premium-tw/40 bg-premium-tw/10 px-3 py-2 text-sm text-premium-tw"
    >
      {message}
    </p>
  );
}
