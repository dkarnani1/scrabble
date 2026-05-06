'use client';

// Sonner-backed implementation of the toast primitive. The actual <Toaster /> is
// mounted once in app/layout.tsx; ToastProvider is preserved as a passthrough so
// existing call sites that wrap subtrees in <ToastProvider> keep working without
// any change. useToast() returns the same { push } shape as before.

import * as React from 'react';
import { toast as sonnerToast } from 'sonner';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastApi = {
  push: (toast: ToastInput) => void;
};

const TOAST_API: ToastApi = {
  push: ({ title, description, tone = 'info' }) => {
    const opts = description ? { description } : undefined;
    switch (tone) {
      case 'success':
        sonnerToast.success(title, opts);
        return;
      case 'warning':
        sonnerToast.warning(title, opts);
        return;
      case 'error':
        sonnerToast.error(title, opts);
        return;
      default:
        sonnerToast.info(title, opts);
    }
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast(): ToastApi {
  return TOAST_API;
}
