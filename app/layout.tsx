import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scrabble',
  description: 'Online multiplayer Scrabble-style web game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-board-base text-tile-ink antialiased">{children}</body>
    </html>
  );
}
