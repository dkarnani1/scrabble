import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          base: '#f5efe1',
          line: '#d6cdb6',
          star: '#b88a4a',
        },
        // Premium-square accents tuned for accessibility (each pair has ≥ 4.5:1
        // contrast against its label) and to be trademark-safe (avoiding the
        // commercial Scrabble palette while keeping double=warm / triple=cool
        // shape recognition that players expect).
        premium: {
          dl: '#9fc2dc',
          tl: '#356f9d',
          // Bumped from #e9a8a8 to #d68a8a so dark labels on DW backgrounds
          // satisfy WCAG AA 4.5:1 contrast (axe color-contrast). Still reads as
          // pink against the felt and against TW red.
          dw: '#d68a8a',
          tw: '#b83f3f',
        },
        tile: {
          face: '#f6e2b3',
          // Bumped from #a07a3b to #8a6730 so accent / eyebrow text on the
          // board-base cream background passes WCAG AA contrast (~5.0:1).
          // Used as text in BentoTileHeader, hero CTAs, history meta rows.
          edge: '#8a6730',
          ink: '#2c1f0e',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 1px 0 rgba(255,255,255,0.5) inset, 0 -3px 0 rgba(0,0,0,0.18) inset, 0 2px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)',
        'tile-lift':
          '0 2px 0 rgba(255,255,255,0.6) inset, 0 -2px 0 rgba(0,0,0,0.15) inset, 0 8px 16px rgba(0,0,0,0.22), 0 3px 6px rgba(0,0,0,0.14)',
        'tile-pressed':
          '0 1px 0 rgba(255,255,255,0.4) inset, 0 -1px 0 rgba(0,0,0,0.12) inset, 0 1px 2px rgba(0,0,0,0.18)',
        // Tentative tile: lift + ring baked in so it's unmistakable on any background.
        'tile-tentative':
          '0 2px 0 rgba(255,255,255,0.55) inset, 0 -2px 0 rgba(160,122,59,0.25) inset, 0 6px 14px rgba(160,122,59,0.35), 0 0 0 1.5px rgba(160,122,59,0.55)',
        'square-inset': 'inset 0 1px 2px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(255,255,255,0.4)',
        // Lighter inset for colored premium squares so the underlying color shows.
        'square-inset-soft': 'inset 0 1px 1px rgba(0,0,0,0.15)',
        'board-deep': '0 20px 50px -20px rgba(44,31,14,0.45), 0 8px 20px -8px rgba(44,31,14,0.25)',
      },
      backgroundImage: {
        'tile-face': 'linear-gradient(180deg, #fbeec2 0%, #f6e2b3 45%, #ecd190 100%)',
        'tile-face-tentative': 'linear-gradient(180deg, #fff5d3 0%, #f9e6b8 45%, #efd594 100%)',
        'board-felt': 'radial-gradient(ellipse at 50% 0%, #f7f1e3 0%, #efe7d2 55%, #e6dcc1 100%)',
        // Premium-square gradients. Values are the same hex as `colors.premium.*`
        // (`#9fc2dc`, `#356f9d`, `#e9a8a8`, `#b83f3f`) and `colors.board.star`
        // (`#b88a4a`); inlined as rgba because Tailwind v4's JS-config compat
        // doesn't resolve `theme()` inside `backgroundImage` strings.
        'premium-dl':
          'linear-gradient(180deg, rgba(159,194,220,0.85) 0%, rgba(159,194,220,0.65) 100%)',
        'premium-tl':
          'linear-gradient(180deg, rgba(53,111,157,0.85) 0%, rgba(53,111,157,0.65) 100%)',
        'premium-dw':
          'linear-gradient(180deg, rgba(214,138,138,0.9) 0%, rgba(214,138,138,0.7) 100%)',
        'premium-tw': 'linear-gradient(180deg, rgba(184,63,63,0.9) 0%, rgba(184,63,63,0.7) 100%)',
        'premium-center':
          'radial-gradient(circle at center, rgba(184,138,74,0.55), rgba(184,138,74,0.15) 70%)',
      },
      keyframes: {
        'tile-drop': {
          '0%': { transform: 'translateY(-6px) scale(1.05)', opacity: '0.7' },
          '60%': { transform: 'translateY(2px) scale(0.98)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'square-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(160,122,59,0.45)' },
          '50%': { boxShadow: '0 0 0 4px rgba(160,122,59,0)' },
        },
      },
      animation: {
        'tile-drop': 'tile-drop 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'square-pulse': 'square-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
