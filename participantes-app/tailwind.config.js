/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        bg:           'var(--color-bg)',
        surface:      'var(--color-surface)',
        border:       'var(--color-border)',
        border2:      'var(--color-border2)',
        text1:        'var(--color-text1)',
        text2:        'var(--color-text2)',
        text3:        'var(--color-text3)',
        accent:       'var(--color-accent)',
        'accent-bg':  'var(--color-accent-bg)',
        'accent-hover': 'var(--color-accent-hover)',
        blue:         'var(--color-blue)',
        'blue-bg':    'var(--color-blue-bg)',
        amber:        'var(--color-amber)',
        'amber-bg':   'var(--color-amber-bg)',
        purple:       'var(--color-purple)',
        'purple-bg':  'var(--color-purple-bg)',
        teal:         'var(--color-teal)',
        'teal-bg':    'var(--color-teal-bg)',
        rose:         'var(--color-rose)',
        'rose-bg':    'var(--color-rose-bg)',
        danger:       'var(--color-danger)',
        'danger-bg':  'var(--color-danger-bg)',
      },
    },
  },
  plugins: [],
}
