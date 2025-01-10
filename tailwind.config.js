/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'neon-green': '#39ff14',
          'dark-bg': '#0a0a0a',
        },
        boxShadow: {
          'neon': '0 0 10px #39ff14',
        },
      },
    },
    plugins: [],
  }