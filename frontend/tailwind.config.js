/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f7f7f5',
          100: '#eeede9',
          300: '#b4b2aa',
          400: '#8f8d85',
          500: '#6b6963',
          600: '#4a4843',
          700: '#343230',
          800: '#242220',
          900: '#0f0f0f',
        },
        sage: {
          DEFAULT: '#4d7c6b',
          dark:    '#2d5a47',
        },
        coral: {
          DEFAULT: '#e85d4a',
          light:   '#ff8a7a',
        },
        amber: {
          budget: '#d97706',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        mono:    ['"DM Mono"', 'monospace'],
        sans:    ['"DM Sans"', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease both',
      },
    },
  },
  plugins: [],
};
