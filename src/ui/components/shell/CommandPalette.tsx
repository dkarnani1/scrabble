'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/components/ui/dialog';
import { useSoundContext } from '@ui/sound/SoundProvider';
import { useReducedMotionOverride } from './ReducedMotionOverrideProvider';
import {
  Home,
  Plus,
  KeyRound,
  Trophy,
  BookOpen,
  Volume2,
  VolumeX,
  LogOut,
  Keyboard,
  HelpCircle,
  Pause,
  Sparkles,
} from 'lucide-react';

export type CommandSection = 'game' | 'navigation' | 'settings' | 'help';

export type CommandEntry = {
  id: string;
  label: string;
  section: CommandSection;
  /** Lucide icon component. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Hint shown trailing the label, e.g. "S" or "⇧ R". */
  shortcut?: string;
  disabled?: boolean;
  perform: () => void;
  /** Search keywords beyond the visible label, comma-separated. */
  keywords?: string;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  commands: ReadonlyArray<CommandEntry>;
};

const SECTION_LABEL: Record<CommandSection, string> = {
  game: 'Game',
  navigation: 'Navigation',
  settings: 'Settings',
  help: 'Help',
};
const SECTION_ORDER: CommandSection[] = ['game', 'navigation', 'settings', 'help'];

/**
 * cmdk-based palette inside a shadcn Dialog. The Dialog handles overlay +
 * focus trap; cmdk handles arrow-key navigation, fuzzy filtering, and the
 * Enter-to-perform contract.
 */
export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
  const router = useRouter();
  const sound = useSoundContext();
  const reduceOverride = useReducedMotionOverride();

  // Built-in commands that are always available. Game commands are merged in
  // from page-level registrations via the provider.
  const builtins = React.useMemo<ReadonlyArray<CommandEntry>>(
    () => [
      {
        id: 'nav.home',
        label: 'Go home',
        section: 'navigation',
        icon: Home,
        perform: () => router.push('/home'),
      },
      {
        id: 'nav.new-game',
        label: 'Start new game',
        section: 'navigation',
        icon: Plus,
        perform: () => router.push('/games/new'),
      },
      {
        id: 'nav.demo',
        label: 'Open board demo',
        section: 'navigation',
        icon: Sparkles,
        keywords: 'dev,test,sandbox',
        perform: () => router.push('/demo-board'),
      },
      {
        id: 'settings.toggle-sound',
        label: sound.enabled ? 'Mute sound effects' : 'Enable sound effects',
        section: 'settings',
        icon: sound.enabled ? VolumeX : Volume2,
        perform: () => sound.setEnabled(!sound.enabled),
      },
      {
        id: 'settings.toggle-motion-override',
        label: reduceOverride.enabled
          ? 'Stop forcing reduced motion'
          : 'Force reduced motion (session)',
        section: 'settings',
        icon: Pause,
        keywords: 'animation,a11y,screenshot',
        perform: () => reduceOverride.setEnabled(!reduceOverride.enabled),
      },
      {
        id: 'settings.sign-out',
        label: 'Sign out',
        section: 'settings',
        icon: LogOut,
        perform: () => {
          // POST to the sign-out route — auth wiring lives outside the UI
          // boundary so we don't import a server action directly.
          void fetch('/auth/sign-out', { method: 'POST' }).then(() => router.push('/'));
        },
      },
      {
        id: 'help.how-to-play',
        label: 'How to play',
        section: 'help',
        icon: BookOpen,
        perform: () => router.push('/demo-board'),
      },
      {
        id: 'help.shortcuts',
        label: 'Keyboard shortcuts',
        section: 'help',
        icon: Keyboard,
        perform: () => {
          // No dedicated page yet — fire a placeholder so the palette closes
          // cleanly and the user can wire this up later.
          window.alert(
            'Cmd+K · open this palette\nArrow keys · move board cursor\nEnter · place selected tile\nEsc · close dialogs',
          );
        },
      },
      {
        id: 'help.about',
        label: 'About this build',
        section: 'help',
        icon: HelpCircle,
        perform: () => window.alert('Scrabble — built with Next.js + Supabase + shadcn + motion.'),
      },
    ],
    [router, sound, reduceOverride],
  );

  const all = React.useMemo<ReadonlyArray<CommandEntry>>(
    () => [...commands, ...builtins],
    [commands, builtins],
  );

  const grouped = React.useMemo(() => {
    const m: Record<CommandSection, CommandEntry[]> = {
      game: [],
      navigation: [],
      settings: [],
      help: [],
    };
    for (const c of all) m[c.section].push(c);
    return m;
  }, [all]);

  const onPick = (entry: CommandEntry) => {
    if (entry.disabled) return;
    onOpenChange(false);
    // Defer to avoid running the action while the Dialog is unmounting.
    setTimeout(() => entry.perform(), 50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-xl gap-0 border-none bg-board-base/95 p-0 ring-1 ring-tile-ink/15 shadow-board-deep backdrop-blur-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Type to search game, navigation, settings, and help commands. Use arrow keys to move and
          Enter to run.
        </DialogDescription>
        <Command
          label="Command palette"
          // shouldFilter is true by default; cmdk fuzz-matches against label +
          // keywords. Items with disabled=true still render but cmdk skips
          // them on Enter, so we additionally guard in onPick.
          className="flex flex-col"
        >
          <Command.Input
            placeholder="Type a command…"
            className="w-full border-b border-tile-ink/10 bg-transparent px-4 py-3 text-sm text-tile-ink placeholder:text-tile-ink/45 focus:outline-none"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-8 text-center text-sm text-tile-ink/60">
              No matching commands.
            </Command.Empty>
            {SECTION_ORDER.map((section) => {
              const items = grouped[section];
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={section}
                  heading={SECTION_LABEL[section]}
                  className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-tile-ink/55"
                >
                  {items.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`${c.label} ${c.keywords ?? ''}`}
                      disabled={c.disabled ?? false}
                      onSelect={() => onPick(c)}
                      className={[
                        'group relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm text-tile-ink outline-none',
                        'data-[selected=true]:bg-tile-edge/12 data-[selected=true]:ring-1 data-[selected=true]:ring-tile-edge/30',
                        'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
                      ].join(' ')}
                    >
                      {c.icon ? (
                        <c.icon className="h-4 w-4 shrink-0 text-tile-ink/65 group-data-[selected=true]:text-tile-edge" />
                      ) : (
                        <span className="h-4 w-4" aria-hidden />
                      )}
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.shortcut && (
                        <kbd
                          className="rounded border border-tile-ink/15 bg-board-base/80 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-tile-ink/70"
                          aria-hidden
                        >
                          {c.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
          <div
            aria-hidden
            className="flex items-center justify-between border-t border-tile-ink/10 px-3 py-1.5 text-[10px] text-tile-ink/50"
          >
            <span>
              <kbd className="rounded border border-tile-ink/15 bg-board-base/80 px-1.5 py-0.5 font-mono">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-tile-ink/15 bg-board-base/80 px-1.5 py-0.5 font-mono">
                Enter
              </kbd>{' '}
              run
            </span>
            <span>
              <kbd className="rounded border border-tile-ink/15 bg-board-base/80 px-1.5 py-0.5 font-mono">
                Esc
              </kbd>{' '}
              close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// re-export so consumers don't need to know about lucide picks here
export { Home, Plus, KeyRound, Trophy };
