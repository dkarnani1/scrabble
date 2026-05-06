import type { Metadata } from 'next';
import './globals.css';
import { Inter, Sora } from 'next/font/google';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@ui/components/ui/tooltip';
import { SoundProvider } from '@ui/sound/SoundProvider';
import { CommandPaletteProvider } from '@ui/components/shell/CommandPaletteProvider';
import { ReducedMotionOverrideProvider } from '@ui/components/shell/ReducedMotionOverrideProvider';
import { cn } from '@ui/lib/classnames';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Scrabble',
  description: 'Online multiplayer Scrabble-style web game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable, sora.variable)}>
      <body className="min-h-screen bg-board-base text-tile-ink antialiased">
        <TooltipProvider>
          <ReducedMotionOverrideProvider>
            <SoundProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </SoundProvider>
          </ReducedMotionOverrideProvider>
        </TooltipProvider>
        <Toaster
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'border border-board-line bg-board-base text-tile-ink shadow-lg rounded-md',
              title: 'font-semibold',
              description: 'text-tile-ink/80',
              actionButton: 'bg-tile-edge text-board-base hover:bg-tile-edge/90',
              cancelButton: 'bg-board-line text-tile-ink hover:bg-board-line/80',
            },
          }}
        />
      </body>
    </html>
  );
}
