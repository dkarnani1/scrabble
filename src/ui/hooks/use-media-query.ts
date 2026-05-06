'use client';

import * as React from 'react';

/**
 * SSR-safe matchMedia hook. Always returns `false` during the initial render so
 * server and client agree on the first paint; switches to the real value in an
 * effect after mount. This avoids hydration mismatches in components whose tree
 * structure depends on viewport (e.g. Rack vs RackSheet), which would otherwise
 * cause downstream id mismatches in dnd-kit's useId.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
