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
        premium: {
          dl: '#9ec9e6',
          tl: '#3f7eb0',
          dw: '#e8b3b3',
          tw: '#c84b4b',
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
