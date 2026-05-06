// Dev-only fixture builder for the in-app home bento. Lets the home page
// render with mock data when the URL carries `?demo=1` or `?demo=empty`. The
// helper is gated by `isDemoHomeAllowed()` so production builds short-circuit
// before any of this fixture data is touched.

import { createEmptyBoard } from '@rules/board';
import type { GameView } from '@/app/actions/types';
import type { HomeBentoProps, LastPlayedSummary, PlayerStats } from './HomeBento';

export type DemoMode = 'populated' | 'empty';

const DEMO_USER_ID = 'demo-user-self';
const NOW = new Date('2026-05-05T12:34:56Z');

export function isDemoHomeAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function buildDemoGameView(args: {
  id: string;
  opponentName: string;
  myTurn: boolean;
  lastWord?: string;
  lastScore?: number;
  myScore: number;
  theirScore: number;
}): GameView {
  const board = createEmptyBoard();
  const history = args.lastWord
    ? [
        {
          move: {
            kind: 'place' as const,
            seq: 1,
            playerSlot: args.myTurn ? (1 as const) : (0 as const),
            tiles: [],
            score: args.lastScore ?? 0,
            words: [args.lastWord],
            isBingo: false,
            createdAt: NOW.toISOString(),
          },
          challenge: { kind: 'unchallenged' as const },
        },
      ]
    : [];
  return {
    id: args.id,
    phase: 'playing',
    timerSetting: '1m',
    dictionaryId: 'enable-default',
    activeSlot: args.myTurn ? 0 : 1,
    turnStartedAt: NOW.toISOString(),
    turnDeadlineAt: new Date(NOW.getTime() + 60_000).toISOString(),
    serverNow: NOW.toISOString(),
    bagRemaining: 42,
    consecutiveScoreless: 0,
    pendingChallenge: null,
    board,
    history,
    players: [
      {
        slot: 0,
        userId: DEMO_USER_ID,
        displayName: 'You',
        score: args.myScore,
        rackCount: 7,
        isHost: true,
        forfeitNext: false,
        connected: true,
        lastSeenAt: NOW.toISOString(),
      },
      {
        slot: 1,
        userId: `demo-opp-${args.id}`,
        displayName: args.opponentName,
        score: args.theirScore,
        rackCount: 7,
        isHost: false,
        forfeitNext: false,
        connected: true,
        lastSeenAt: NOW.toISOString(),
      },
    ],
    myRack: null,
    result: null,
  };
}

export function buildDemoHomeProps(mode: DemoMode): HomeBentoProps {
  if (mode === 'empty') {
    return { myUserId: DEMO_USER_ID, games: [], lastPlayed: null, stats: null };
  }

  const games: GameView[] = [
    buildDemoGameView({
      id: 'demo-1',
      opponentName: 'Jordan',
      myTurn: true,
      lastWord: 'JOLTED',
      lastScore: 32,
      myScore: 184,
      theirScore: 167,
    }),
    buildDemoGameView({
      id: 'demo-2',
      opponentName: 'Sam',
      myTurn: true,
      lastWord: 'QUARTZ',
      lastScore: 41,
      myScore: 91,
      theirScore: 104,
    }),
    buildDemoGameView({
      id: 'demo-3',
      opponentName: 'Priya',
      myTurn: false,
      lastWord: 'AXED',
      lastScore: 18,
      myScore: 56,
      theirScore: 49,
    }),
    buildDemoGameView({
      id: 'demo-4',
      opponentName: 'Casey',
      myTurn: false,
      lastWord: 'ZEPHYR',
      lastScore: 28,
      myScore: 122,
      theirScore: 130,
    }),
    {
      ...buildDemoGameView({
        id: 'demo-5',
        opponentName: 'Riley',
        myTurn: false,
        myScore: 0,
        theirScore: 0,
      }),
      phase: 'lobby',
      activeSlot: null,
    },
  ];

  const lastPlayed: LastPlayedSummary = {
    gameId: 'demo-finished-1',
    opponentName: 'Morgan',
    yourScore: 312,
    theirScore: 287,
    endedAt: '2026-05-04T18:30:00Z',
  };

  const stats: PlayerStats = {
    played: 24,
    wins: 17,
    bestWord: 'QUIXOTIC',
    bestWordScore: 76,
  };

  return { myUserId: DEMO_USER_ID, games, lastPlayed, stats };
}
