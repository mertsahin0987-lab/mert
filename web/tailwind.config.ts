import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Minimalist monochrome palette + a single oxblood accent
        ink: '#0d0d0d',          // primary text + sparing dark surfaces
        paper: '#ffffff',         // base background
        cream: '#f7f5f1',         // subtle section break (warmer than grey)
        line: '#e8e6e0',          // hair-line borders
        muted: '#525252',         // secondary text
        dim: '#8a8a8a',           // tertiary text
        accent: '#7c2d12',        // deep oxblood — more "barber" than red
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        'tightest': '-0.04em',
      },
    },
  },
} satisfies Config;
