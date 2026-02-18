import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['Georgia', 'serif'] },
      colors: {
        retro: { bg: '#000033', text: '#ff99ff', accent: '#ff6699' }
      }
    }
  },
  plugins: [],
} satisfies Config;
