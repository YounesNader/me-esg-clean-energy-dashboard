import { useEffect, useRef, useState, memo } from 'react'
import MiniSparkline from './MiniSparkline.jsx'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    if (target === null || target === undefined) return
    const numTarget = parseFloat(String(target).replace(/[^0-9.]/g, '')) || 0
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(numTarget * eased)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

const ACCENTS = {
  teal:    { border: 'rgba(0,212,170,0.28)',   bg: 'rgba(0,212,170,0.05)',   text: '#00d4aa',  glow: 'rgba(0,212,170,0.07)'  },
  emerald: { border: 'rgba(16,185,129,0.28)',  bg: 'rgba(16,185,129,0.05)',  text: '#10b981',  glow: 'rgba(16,185,129,0.07)' },
  amber:   { border: 'rgba(245,158,11,0.28)',  bg: 'rgba(245,158,11,0.05)',  text: '#f59e0b',  glow: 'rgba(245,158,11,0.07)' },
  blue:    { border: 'rgba(59,130,246,0.28)',  bg: 'rgba(59,130,246,0.05)',  text: '#3b82f6',  glow: 'rgba(59,130,246,0.07)' },
  red:     { border: 'rgba(239,68,68,0.28)',   bg: 'rgba(239,68,68,0.05)',   text: '#ef4444',  glow: 'rgba(239,68,68,0.07)'  },
}

const KPICard = memo(function KPICard({
  label, value, unit = '', sub = '',
  trend = null, sparkData = null,
  loading = false, color = 'teal', delay = 0,
}) {
  const numVal  = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
  const animated = useCountUp(loading ? 0 : numVal)
  const accent   = ACCENTS[color] || ACCENTS.teal

  const formatDisplay = () => {
    const orig = String(value)
    if (orig.includes('B')) return `${animated.toFixed(1)}B`
    if (orig.includes('M')) return `${Math.round(animated).toLocaleString()}M`
    if (orig.includes('%')) return `${animated.toFixed(1)}%`
    if (Number.isInteger(numVal)) return Math.round(animated).toLocaleString()
    return animated.toFixed(1)
  }

  if (loading) {
    return (
      <div className="card p-4" style={{ animationDelay: `${delay}ms` }}>
        <div className="skeleton" style={{ height: 3, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 36, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 8, width: '50%' }} />
      </div>
    )
  }

  const prefix = String(value).startsWith('$') ? '$' : ''

  return (
    <div
      className="card card-accent-top page-enter"
      style={{
        padding: 16,
        animationDelay: `${delay}ms`,
        borderColor: accent.border,
        boxShadow: `inset 0 0 40px ${accent.glow}`,
        '--card-accent': accent.text,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accent.text}, transparent 70%)`,
        borderRadius: '12px 12px 0 0',
      }} />

      {/* Label */}
      <p style={{
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'var(--text-muted)',
        marginBottom: 8,
        marginTop: 4,
      }}>
        {label}
      </p>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
        <span style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 34,
          color: accent.text,
          lineHeight: 1,
          letterSpacing: '0.02em',
        }}>
          {prefix}{formatDisplay()}
        </span>
        {unit && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 1 }}>{unit}</span>
        )}
      </div>

      {/* Sparkline */}
      {sparkData && sparkData.length > 0 && (
        <div style={{ margin: '6px 0' }}>
          <MiniSparkline data={sparkData} color={accent.text} height={24} />
        </div>
      )}

      {/* Sub + trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {sub && (
          <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>{sub}</p>
        )}
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 7px',
            borderRadius: 20,
            fontSize: 10,
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 600,
            background: trend.direction === 'up' ? 'rgba(16,185,129,0.1)' : trend.direction === 'down' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            color: trend.direction === 'up' ? '#10b981' : trend.direction === 'down' ? '#ef4444' : '#f59e0b',
          }}>
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '→'}
            {' '}{trend.label}
          </div>
        )}
      </div>
    </div>
  )
})

export default KPICard
