import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { pingApi } from '../../Api/apiClient.js'
import LiveClock from '../UI/LiveClock.jsx'

const NAV = [
  { path: '/',            icon: GridIcon,   label: 'Overview'     },
  { path: '/country',     icon: GlobeIcon,  label: 'Countries'    },
  { path: '/forecast',    icon: ChartIcon,  label: 'Forecast'     },
  { path: '/insights',    icon: BoltIcon,   label: 'Insights'     },
  { path: '/methodology', icon: BookIcon,   label: 'Methodology'  },
]

export default function Sidebar() {
  const [apiAlive,    setApiAlive]    = useState(null)
  const [pingMs,      setPingMs]      = useState(null)
  const [collapsed,   setCollapsed]   = useState(false)

  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      const res = await pingApi()
      const ms = Math.round(performance.now() - t0)
      setApiAlive(!!res)
      setPingMs(ms)
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [])

  const w = collapsed ? 56 : 240

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0e0e16 0%, var(--bg-base) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
        transition: 'width 0.22s ease, min-width 0.22s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo area */}
      <div style={{
        padding: collapsed ? '20px 0' : '22px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <LeafLogo />
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 22,
              letterSpacing: '0.08em',
              color: 'var(--teal)',
              lineHeight: 1,
            }}>
              ESG
            </div>
            <div style={{
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              lineHeight: 1.3,
              marginTop: 1,
            }}>
              Analytics · ME Region
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          position: 'absolute',
          top: 26,
          right: -10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--bg-raised)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11,
          transition: 'background 0.15s',
          color: 'var(--text-muted)',
          fontSize: 8,
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Nav section label */}
      {!collapsed && (
        <div style={{
          padding: '14px 20px 6px',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          Navigation
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px 0' : '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.15s',
              color: isActive ? 'var(--teal)' : 'var(--text-muted)',
              background: isActive ? 'rgba(0,212,170,0.10)' : 'transparent',
              borderLeft: !collapsed && isActive ? '2px solid var(--teal)' : '2px solid transparent',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            })}
          >
            <Icon size={15} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: clock + API status */}
      <div style={{
        padding: collapsed ? '12px 6px' : '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {!collapsed && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <LiveClock />
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <span
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              flexShrink: 0,
              background: apiAlive === null ? '#475569' : apiAlive ? '#10b981' : '#ef4444',
              boxShadow: apiAlive ? '0 0 6px #10b981' : 'none',
              display: 'inline-block',
              animation: apiAlive ? 'pulseDot 2s ease-in-out infinite' : 'none',
            }}
          />
          {!collapsed && (
            <div>
              <div style={{ fontSize: 10, color: apiAlive ? '#10b981' : 'var(--text-muted)', fontWeight: 500 }}>
                {apiAlive === null ? 'Checking…' : apiAlive ? 'API Live' : 'Offline'}
                {apiAlive && pingMs && (
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    marginLeft: 5,
                  }}>
                    {pingMs}ms
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                localhost:8000
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function LeafLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="rgba(0,212,170,0.12)" />
      <path d="M16 6C16 6 8 10 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 10 16 6 16 6Z" fill="#00d4aa" opacity="0.9"/>
      <path d="M16 6C16 6 16 14 16 22" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 14C16 14 12 12 10 14" stroke="#0a0a0f" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M16 18C16 18 20 16 22 18" stroke="#0a0a0f" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function GridIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}
function GlobeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5C8 1.5 5.5 4 5.5 8C5.5 12 8 14.5 8 14.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5C8 1.5 10.5 4 10.5 8C10.5 12 8 14.5 8 14.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 8H14.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}
function ChartIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5.5 7.5L8.5 9.5L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function BoltIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 1.5L3 9H8L7 14.5L13 7H8L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function BookIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 5.5H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 8H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 10.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
