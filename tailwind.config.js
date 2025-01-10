/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': 'var(--neon-green)',
        'neon-green-opacity': 'var(--neon-green-opacity)',
        'dark-bg': 'var(--dark-bg)',
      },
    },
  },
  plugins: [],
}