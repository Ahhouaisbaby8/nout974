/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nout-primary':   '#FF6B35',
        'nout-secondary': '#FAF6F1',
        'nout-dark':      '#333333',
        'nout-border':    '#E0E0E0',
        'nout-light':     '#F5F5F5',
        'nout-success':   '#4CAF50',
        'nout-error':     '#F44336',
        'nout-warning':   '#FF9800',
        'nout-info':      '#2196F3',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'nout': '9999px',
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.2', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
