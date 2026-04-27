'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';

// Tiny toast primitive. shadcn-CLI-installed Toast typically depends on Radix;
// this version keeps the dependency footprint at zero for the foundational phase.
// Phase 4 (US2) will revisit if the design requires the full primitive.

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

type ToastEntry = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastApi = {
  push: (toast: Omit<ToastEntry, 'id'>) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const push = React.useCallback((toast: Omit<ToastEntry, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const api = React.useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-md border p-3 shadow-md',
              t.tone === 'success' && 'border-green-300 bg-green-50 text-green-900',
              t.tone === 'warning' && 'border-amber-300 bg-amber-50 text-amber-900',
              t.tone === 'error' && 'border-red-300 bg-red-50 text-red-900',
              (t.tone === 'info' || !t.tone) && 'border-board-line bg-board-base text-tile-ink',
            )}
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description && <div className="mt-0.5 text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be called inside <ToastProvider>.');
  return ctx;
}
