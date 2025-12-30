/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        linkBlue: 'var(--link-blue)',
        roast: 'var(--roast-color)',
        bg: 'var(--bg-color)',
        card: 'var(--card-bg)'
      }
    }
  },
  plugins: [],
};
