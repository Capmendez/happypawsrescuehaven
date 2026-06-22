/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hprh: {
          paper: '#FBF7EE',      // warm off-white background
          pine: '#1F2A1E',       // deep pine/charcoal-green — primary text, near-black
          clay: '#C75D3A',       // burnt terracotta — primary CTA color ONLY, use sparingly
          sage: '#5C7A5E',       // secondary green — links, secondary buttons, accents
          gold: '#E8B23D',       // warm gold — status dots/badges for "available" ONLY
          'paper-dark': '#F0EADC', // slightly darker paper for card backgrounds/sections
        }
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        serif: ['Fraunces', 'serif'],
        sans: ['"Public Sans"', 'sans-serif'],
        body: ['"Public Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        utility: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.16' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      }
    },
  },
  plugins: [],
}
