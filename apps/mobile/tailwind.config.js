/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './hooks/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: '#ff6699',
        'retro-bg': '#000033',
        'retro-text': '#ff99ff',
        'retro-accent': '#ff6699',
      },
    },
  },
  plugins: [],
};
