/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        bg: '#F7F6F2',
        surface: '#FFFFFF',
        border: '#E2DFD8',
        border2: '#C8C4BC',
        text1: '#1C1B19',
        text2: '#6B6860',
        text3: '#9B9890',
        accent: '#1C6B4A',
        'accent-bg': '#EAF5EE',
        blue: '#1A5BAB',
        'blue-bg': '#EBF2FC',
        amber: '#92520C',
        'amber-bg': '#FDF3E3',
        purple: '#6B3BAD',
        'purple-bg': '#F3EBFC',
        teal: '#0D7A7A',
        'teal-bg': '#E6F7F7',
        rose: '#A32060',
        'rose-bg': '#FCE8F1',
        danger: '#A32020',
        'danger-bg': '#FCEAEA',
      },
    },
  },
  plugins: [],
}

