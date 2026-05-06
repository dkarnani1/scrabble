'use client';

import * as React from 'react';
import { CommandPalette, type CommandEntry } from './CommandPalette';

type CommandPaletteApi = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const CommandPaletteContext = React.createContext<CommandPaletteApi | null>(null);

type RegistryApi = {
  register: (id: string, commands: ReadonlyArray<CommandEntry>) => void;
  unregister: (id: string) => void;
  /** Snapshot of all registered command sources, flattened by source order. */
  all: ReadonlyArray<CommandEntry>;
};

const RegistryContext = React.createContext<RegistryApi | null>(null);

export function useCommandPalette(): CommandPaletteApi {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) return { open: false, setOpen: () => {} };
  return ctx;
}

/**
 * Pages call this in a `useEffect` to push commands relevant to their context
 * (e.g. PlayClient registers shuffle/recall/pass on mount). The hook
 * unregisters automatically on unmount or when `deps` change.
 */
export function useRegisterCommands(
  id: string,
  commands: ReadonlyArray<CommandEntry>,
  deps: ReadonlyArray<unknown>,
): void {
  const ctx = React.useContext(RegistryContext);
  // Caller is expected to memoize via the deps argument; this is the standard
  // useRegisterCommands(...) shape. The rule we'd disable here is not loaded
  // in the project's eslint config.
  const memoCommands = React.useMemo(() => commands, deps);
  React.useEffect(() => {
    if (!ctx) return;
    ctx.register(id, memoCommands);
    return () => ctx.unregister(id);
  }, [ctx, id, memoCommands]);
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // Map from source-id → command list. Iteration order is insertion order so
  // page-specific commands appear after global ones.
  const [sources, setSources] = React.useState<Map<string, ReadonlyArray<CommandEntry>>>(
    () => new Map(),
  );

  const register = React.useCallback((id: string, commands: ReadonlyArray<CommandEntry>) => {
    setSources((prev) => {
      const next = new Map(prev);
      next.set(id, commands);
      return next;
    });
  }, []);
  const unregister = React.useCallback((id: string) => {
    setSources((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const all = React.useMemo<ReadonlyArray<CommandEntry>>(() => {
    const flat: CommandEntry[] = [];
    for (const list of sources.values()) flat.push(...list);
    return flat;
  }, [sources]);

  // Global Cmd+K / Ctrl+K listener. We attach in a single effect at the
  // provider level so per-page mounts don't need to manage shortcuts.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const paletteApi = React.useMemo<CommandPaletteApi>(() => ({ open, setOpen }), [open]);
  const registryApi = React.useMemo<RegistryApi>(
    () => ({ register, unregister, all }),
    [register, unregister, all],
  );

  return (
    <CommandPaletteContext.Provider value={paletteApi}>
      <RegistryContext.Provider value={registryApi}>
        {children}
        <CommandPalette open={open} onOpenChange={setOpen} commands={all} />
      </RegistryContext.Provider>
    </CommandPaletteContext.Provider>
  );
}
