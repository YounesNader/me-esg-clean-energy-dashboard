import { useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const TITLES = {
  '/':            { title: 'Overview',     crumbs: ['Dashboard', 'Overview'] },
  '/country':     { title: 'Countries',    crumbs: ['Dashboard', 'Country Deep Dive'] },
  '/forecast':    { title: 'Forecast',     crumbs: ['Dashboard', 'Forecasting'] },
  '/insights':    { title: 'Insights',     crumbs: ['Dashboard', 'Insights'] },
  '/methodology': { title: 'Methodology',  crumbs: ['Dashboard', 'Methodology'] },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const base = '/' + pathname.split('/')[1]
  const info = TITLES[base] || TITLES['/']

  const [progress, setProgress] = useState(true)

  useEffect(() => {
    setProgress(true)
    const id = setTimeout(() => setProgress(false), 900)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <header style={{
      background: 'rgba(10,10,15,0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      flexShrink: 0,
    }}>
      {/* Progress bar */}
      {progress && <div className="progress-bar" />}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
      }}>
        {/* Left: breadcrumbs + title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {info.crumbs.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>›</span>
                )}
                <span style={{
                  fontSize: 10,
                  color: i === info.crumbs.length - 1 ? 'var(--teal)' : 'var(--text-muted)',
                  fontWeight: i === info.crumbs.length - 1 ? 600 : 400,
                  letterSpacing: '0.04em',
                }}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
          <h1 style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 22,
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
            lineHeight: 1,
            margin: 0,
          }}>
            {info.title}
          </h1>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Data range badge */}
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(0,212,170,0.07)',
            color: 'var(--teal)',
            border: '1px solid rgba(0,212,170,0.18)',
            letterSpacing: '0.04em',
          }}>
            2015 – 2024
          </span>

          {/* Forecast badge */}
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(245,158,11,0.07)',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.18)',
            letterSpacing: '0.04em',
          }}>
            ⚡ 2030
          </span>

          {/* LIVE badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
              animation: 'pulseDot 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              fontWeight: 600,
              color: '#10b981',
              letterSpacing: '0.1em',
            }}>
              LIVE
            </span>
          </div>

          {/* Settings icon (placeholder) */}
          <button
            title="Settings"
            style={{
              width: 30, height: 30,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </header>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
