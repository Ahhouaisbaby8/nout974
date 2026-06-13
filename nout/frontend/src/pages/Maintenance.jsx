export default function Maintenance() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Logo NOUT */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: 'clamp(52px, 12vw, 80px)',
          fontWeight: 900,
          color: '#FFFFFF',
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: '-2px',
          lineHeight: 1,
        }}>
          NOUT
        </div>
        <p style={{
          color: '#00C4B4',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '5px',
          marginTop: '8px',
          textTransform: 'uppercase',
        }}>
          LA RÉUNION 974
        </p>
      </div>

      {/* Séparateur turquoise */}
      <div style={{
        width: '48px',
        height: '3px',
        background: 'linear-gradient(90deg, #00C4B4, #0E7FAB)',
        borderRadius: '2px',
        margin: '32px auto',
      }} />

      {/* Titre */}
      <h1 style={{
        color: '#FFFFFF',
        fontSize: 'clamp(20px, 5vw, 28px)',
        fontWeight: 700,
        fontFamily: "'Montserrat', sans-serif",
        marginBottom: '16px',
      }}>
        Site en maintenance
      </h1>

      {/* Description */}
      <p style={{
        color: 'rgba(255,255,255,0.55)',
        fontSize: '15px',
        maxWidth: '460px',
        lineHeight: 1.75,
        marginBottom: '44px',
      }}>
        Nous améliorons NOUT pour vous offrir une meilleure expérience.
        <br />
        Nous serons de retour très bientôt&nbsp;!
      </p>

      {/* Animation — 3 points turquoise */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '52px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            background: '#00C4B4',
            animation: 'nout-bounce 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.22}s`,
          }} />
        ))}
      </div>

      {/* Contact */}
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '6px' }}>
        Une question ?
      </p>
      <a
        href="mailto:contact@nout.re"
        style={{
          color: '#00C4B4',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          borderBottom: '1px solid rgba(0,196,180,0.35)',
          paddingBottom: '2px',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => e.target.style.opacity = '0.75'}
        onMouseLeave={e => e.target.style.opacity = '1'}
      >
        contact@nout.re
      </a>

      <style>{`
        @keyframes nout-bounce {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40%            { opacity: 1;    transform: scale(1.25); }
        }
      `}</style>
    </div>
  )
}
