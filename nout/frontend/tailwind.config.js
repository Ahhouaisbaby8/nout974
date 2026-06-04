/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Palette VANILLE ── */
        'nout-primary':   '#E8A000',   // or vanille — couleur signature
        'nout-dark-pri':  '#C78800',   // hover / pressed
        'nout-light-pri': '#FFB830',   // variante claire
        'nout-pale-pri':  '#FFF9E6',   // fond teinté doré léger

        'nout-accent':    '#FFB830',   // ambre / accent
        'nout-gold':      '#F0C040',   // doré lumineux

        'nout-secondary': '#FFFBF0',   // fond principal (crème chaude)
        'nout-light':     '#FFF5D6',   // fond secondaire
        'nout-creme':     '#FFF0B3',   // fond cartes

        'nout-dark':      '#2C1A00',   // texte principal (cacao)
        'nout-mid':       '#5C3A00',   // texte secondaire
        'nout-muted':     '#9D7E45',   // texte discret

        'nout-border':    '#F0D9A0',   // bordure dorée légère
        'nout-border-md': '#D4B866',   // bordure accentuée

        'nout-success':   '#2D9B50',
        'nout-error':     '#E53E3E',
        'nout-warning':   '#DD6B20',
        'nout-info':      '#0099B8',
      },

      fontFamily: {
        sans:  ['Inter', 'Segoe UI', 'sans-serif'],
        title: ['Nunito', 'Segoe UI', 'sans-serif'],
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
        'nout-sm':   '0 2px 8px rgba(44, 26, 0, 0.10)',
        'nout-md':   '0 4px 16px rgba(44, 26, 0, 0.13)',
        'nout-lg':   '0 8px 32px rgba(44, 26, 0, 0.16)',
        'nout-glow': '0 0 24px rgba(232, 160, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
