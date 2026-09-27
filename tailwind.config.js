/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f14',
        card: '#151b23',
        line: '#243040',
        accent: '#22c55e',
        warn: '#f59e0b',
        rest: '#38bdf8',
      },
    },
  },
  plugins: [],
};
