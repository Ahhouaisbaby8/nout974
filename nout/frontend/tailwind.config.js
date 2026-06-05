/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Palette NUIT TROPICALE 🌊 ── */
        'nout-primary':   '#2EC4B6',   // turquoise signature
        'nout-dark-pri':  '#24A99D',   // hover turquoise
        'nout-light-pri': '#5ED8CC',   // turquoise clair
        'nout-pale-pri':  '#E0FAF8',   // fond teinté turquoise

        'nout-accent':    '#0A1628',   // nuit profonde (CTA dark)
        'nout-lagon':     '#0096C7',   // bleu lagon (info)

        'nout-secondary': '#F5FFFE',   // fond principal
        'nout-light':     '#EDFCFB',   // fond alternatif
        'nout-card':      '#FFFFFF',   // fond cartes

        'nout-dark':      '#0A1628',   // texte principal (nuit)
        'nout-mid':       '#1A4A5A',   // texte secondaire
        'nout-muted':     '#4A8A8A',   // texte discret

        'nout-border':    '#B2EDE8',   // bordure turquoise légère
        'nout-border-md': '#7ED8D2',   // bordure accentuée

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
        'nout-glow': '0 0 28px rgba(46, 196, 182, 0.35)',
      },
    },
  },
  plugins: [],
}
