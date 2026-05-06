// Sound event vocabulary for the game UI. Audio assets live under /public/sounds
// and are loaded lazily by `useGameSound` — a missing file simply means the
// corresponding event is silent. To swap a sound, drop a new file at the path
// below; no code changes required.

export type SoundEvent =
  | 'tile-pickup'
  | 'tile-place'
  | 'tile-recall'
  | 'rack-shuffle'
  | 'commit-success'
  | 'commit-invalid'
  | 'opponent-move'
  | 'bingo'
  | 'turn-start'
  | 'timer-warning'
  | 'win'
  | 'lose'
  | 'draw';

export interface SoundConfig {
  /** Path under /public — used as the URL for the Howler load. */
  src: string;
  /** Per-event base volume, 0..1. Multiplied by the user's global volume. */
  volume: number;
  /**
   * When true, replaying the event interrupts a still-decaying instance so a
   * rapid sequence of placements overlaps cleanly. False for events whose
   * full body should always be heard (commit-success, win/lose, bingo).
   */
  interruptible: boolean;
  /**
   * Non-essential events are suppressed under prefers-reduced-motion. Game-state
   * events (commit, win/lose, bingo, opponent-move, turn-start, timer-warning)
   * still play because they convey information no other channel does.
   */
  essential: boolean;
}

export const SOUND_MAP: Record<SoundEvent, SoundConfig> = {
  'tile-pickup': {
    src: '/sounds/tile-pickup.mp3',
    volume: 0.3,
    interruptible: true,
    essential: false,
  },
  'tile-place': {
    src: '/sounds/tile-place.mp3',
    volume: 0.35,
    interruptible: true,
    essential: false,
  },
  'tile-recall': {
    src: '/sounds/tile-recall.mp3',
    volume: 0.3,
    interruptible: true,
    essential: false,
  },
  'rack-shuffle': {
    src: '/sounds/rack-shuffle.mp3',
    volume: 0.35,
    interruptible: true,
    essential: false,
  },
  'commit-success': {
    src: '/sounds/commit-success.mp3',
    volume: 0.5,
    interruptible: false,
    essential: true,
  },
  'commit-invalid': {
    src: '/sounds/commit-invalid.mp3',
    volume: 0.45,
    interruptible: false,
    essential: true,
  },
  'opponent-move': {
    src: '/sounds/opponent-move.mp3',
    volume: 0.4,
    interruptible: false,
    essential: true,
  },
  bingo: {
    src: '/sounds/bingo.mp3',
    volume: 0.7,
    interruptible: false,
    essential: true,
  },
  'turn-start': {
    src: '/sounds/turn-start.mp3',
    volume: 0.45,
    interruptible: false,
    essential: true,
  },
  'timer-warning': {
    src: '/sounds/timer-warning.mp3',
    volume: 0.55,
    interruptible: false,
    essential: true,
  },
  win: {
    src: '/sounds/win.mp3',
    volume: 0.6,
    interruptible: false,
    essential: true,
  },
  lose: {
    src: '/sounds/lose.mp3',
    volume: 0.55,
    interruptible: false,
    essential: true,
  },
  draw: {
    src: '/sounds/draw.mp3',
    volume: 0.55,
    interruptible: false,
    essential: true,
  },
};

export const SOUND_EVENTS: ReadonlyArray<SoundEvent> = Object.keys(SOUND_MAP) as SoundEvent[];
