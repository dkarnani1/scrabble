'use client';

import * as React from 'react';

type Api = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
};

const Ctx = React.createContext<Api | null>(null);

export function useReducedMotionOverride(): Api {
  const v = React.useContext(Ctx);
  return v ?? { enabled: false, setEnabled: () => {} };
}

/**
 * Session-only override that forces reduced-motion behavior even when the OS
 * preference is "no preference". Useful for screenshot capture or for users
 * who change their mind without touching system settings. The override is
 * applied by writing `data-force-reduced-motion="1"` on the document root —
 * Tailwind / motion users can read it via the existing
 * `prefers-reduced-motion` media query OR via this attribute when it's set.
 *
 * Lives outside SoundProvider because it's broader than sound: every motion
 * consumer (rack, board, overlay) should be able to honor it.
 */
export function ReducedMotionOverrideProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = React.useState(false);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (enabled) {
      document.documentElement.dataset.forceReducedMotion = '1';
    } else {
      delete document.documentElement.dataset.forceReducedMotion;
    }
  }, [enabled]);

  const api = React.useMemo<Api>(() => ({ enabled, setEnabled: setEnabledState }), [enabled]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
