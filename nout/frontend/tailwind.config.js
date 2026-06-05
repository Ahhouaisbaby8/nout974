/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Palette NOUT V2 — Depop × StockX × 974 ── */
        'nout-nuit':      '#0A0F2C',   // fond sombre profond
        'nout-roi':       '#1A3A8F',   // bleu roi signature
        'nout-lagon':     '#0E7FAB',   // bleu lagon
        'nout-turquoise': '#00C4B4',   // turquoise vif accent
        'nout-creme':     '#F5F0E8',   // crème fond clair
        'nout-texte':     '#1A1A2E',   // texte principal
        'nout-muted':     '#6B7A99',   // texte secondaire
        'nout-fond':      '#F8FAFF',   // fond général
        'nout-fond-alt':  '#EEF2FF',   // fond alternatif
        'nout-border':    '#D6E0F5',   // bordure légère

        /* Aliases rétro-compat (anciens composants) */
        'nout-primary':   '#00C4B4',
        'nout-dark-pri':  '#00A89A',
        'nout-pale-pri':  '#E0FAF8',
        'nout-secondary': '#F8FAFF',
        'nout-light':     '#EEF2FF',
        'nout-card':      '#FFFFFF',
        'nout-dark':      '#1A1A2E',
        'nout-mid':       '#2A3A6A',
        'nout-border-md': '#A8BDE8',
        'nout-success':   '#15803D',
        'nout-error':     '#B91C1C',
        'nout-warning':   '#C2410C',
        'nout-info':      '#1A3A8F',
      },

      fontFamily: {
        sans:  ['"Inter"', 'Segoe UI', 'sans-serif'],
        title: ['"Syne"', 'Segoe UI', 'sans-serif'],
      },

      backgroundImage: {
        'nout-hero':   'linear-gradient(135deg, #0A0F2C 0%, #1A3A8F 50%, #0E7FAB 100%)',
        'nout-accent': 'linear-gradient(135deg, #0E7FAB 0%, #00C4B4 100%)',
        'nout-card-grad': 'linear-gradient(135deg, #E8F0FF 0%, #EEF2FF 50%, #E0F4F8 100%)',
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
        'nout-sm':   '0 2px 8px rgba(10,15,44,0.08)',
        'nout-md':   '0 4px 24px rgba(10,15,44,0.10)',
        'nout-lg':   '0 8px 40px rgba(10,15,44,0.15)',
        'nout-glow': '0 0 28px rgba(0,196,180,0.35)',
        'nout-hover':'0 8px 32px rgba(14,127,171,0.18)',
      },
    },
  },
  plugins: [],
}
