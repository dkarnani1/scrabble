'use client';

// Re-export shadcn Dialog primitives behind the existing primitives API. Call
// sites continue to import { Dialog, DialogContent, DialogTitle, ... } from
// '@ui/components/primitives' — only the implementation changed (Radix-backed,
// portal-rendered, accessibility-tested).

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@ui/components/ui/dialog';
