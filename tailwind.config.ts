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
          dw: '#e9a8a8',
          tw: '#b83f3f',
        },
        tile: {
          face: '#f6e2b3',
          edge: '#a07a3b',
          ink: '#2c1f0e',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
