/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Palette HIBISCUS 🌺 ── */
        'nout-primary':   '#D94F5C',   // rouge hibiscus 974
        'nout-dark-pri':  '#B83847',   // hover
        'nout-light-pri': '#F07080',   // clair
        'nout-pale-pri':  '#FFF0F2',   // fond rose pâle

        'nout-accent':    '#FF8370',   // corail chaud
        'nout-lagon':     '#0096C7',   // bleu lagon

        'nout-secondary': '#FDFBFB',   // fond principal
        'nout-light':     '#FDF4F5',   // fond alternatif
        'nout-card':      '#FFFFFF',   // fond cartes

        'nout-dark':      '#1A0A0C',   // texte principal
        'nout-mid':       '#5C2830',   // texte secondaire
        'nout-muted':     '#9D666D',   // texte discret

        'nout-border':    '#F0D0D3',   // bordure rose légère
        'nout-border-md': '#E0A8AE',   // bordure accentuée

        'nout-success':   '#15803D',
        'nout-error':     '#B91C1C',
        'nout-warning':   '#C2410C',
        'nout-info':      '#0369A1',
      },

      fontFamily: {
        sans:  ['"DM Sans"', 'Segoe UI', 'sans-serif'],
        title: ['"Plus Jakarta Sans"', 'Segoe UI', 'sans-serif'],
      },

      borderRadius: {
        'nout': '9999px',
        'card': '16px',
      },

      fontSize: {
        'h1': ['32px', { lineHeight: '1.15', fontWeight: '800' }],
        'h2': ['24px', { lineHeight: '1.2',  fontWeight: '700' }],
        'h3': ['20px', { lineHeight: '1.25', fontWeight: '700' }],
        'h4': ['16px', { lineHeight: '1.3',  fontWeight: '600' }],
      },

      boxShadow: {
        'nout-sm':   '0 2px 8px rgba(26, 10, 12, 0.09)',
        'nout-md':   '0 4px 20px rgba(26, 10, 12, 0.12)',
        'nout-lg':   '0 8px 40px rgba(26, 10, 12, 0.15)',
        'nout-glow': '0 0 28px rgba(217, 79, 92, 0.30)',
      },
    },
  },
  plugins: [],
}
