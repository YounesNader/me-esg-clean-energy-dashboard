import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: 96,
        color: 'rgba(0,212,170,0.12)',
        lineHeight: 1,
        letterSpacing: '0.06em',
        marginBottom: 16,
      }}>
        404
      </div>
      <h1 style={{
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: 24,
        letterSpacing: '0.06em',
        color: 'var(--text-primary)',
        marginBottom: 8,
      }}>
        Page not found
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
        This route doesn't exist in the dashboard.
      </p>
      <Link
        to="/"
        style={{
          padding: '9px 20px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: 'rgba(0,212,170,0.10)',
          border: '1px solid rgba(0,212,170,0.28)',
          color: 'var(--teal)',
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
      >
        ← Back to Overview
      </Link>
    </div>
  )
}
