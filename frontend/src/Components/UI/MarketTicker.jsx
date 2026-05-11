import { memo } from 'react'

const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}
const CODES = {
  'Saudi Arabia': 'KSA', UAE: 'UAE', Qatar: 'QAT', Kuwait: 'KWT',
  Oman: 'OMN', Egypt: 'EGY', Bahrain: 'BHR', Jordan: 'JOR',
}

const TickerItem = memo(function TickerItem({ summary }) {
  const total = summary.total_esg_budget_usd_million
  const val = total >= 1000 ? `$${(total / 1000).toFixed(1)}B` : `$${Math.round(total)}M`
  // Simulate YoY change (derived from avg score)
  const change = ((summary.avg_esg_score - 50) / 50 * 15).toFixed(1)
  const isUp = parseFloat(change) >= 0

  return (
    <div
      className="flex items-center gap-2.5 px-5"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
    >
      <span style={{ fontSize: 14 }}>{FLAGS[summary.country] || '🌍'}</span>
      <div>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
        }}>
          {CODES[summary.country] || summary.country}
        </span>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginLeft: 8,
        }}>
          {val}
        </span>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          color: isUp ? 'var(--emerald)' : 'var(--red)',
          marginLeft: 6,
        }}>
          {isUp ? '▲' : '▼'} {Math.abs(change)}%
        </span>
      </div>
    </div>
  )
})

export default memo(function MarketTicker({ summaries = [] }) {
  if (!summaries.length) return null
  // Double the array so the infinite scroll looks seamless
  const doubled = [...summaries, ...summaries]

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.35)',
        borderBottom: '1px solid var(--border)',
        borderTop: '1px solid var(--border)',
        overflow: 'hidden',
        height: 36,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Label */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 80,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        background: 'linear-gradient(90deg, var(--bg-base) 60%, transparent)',
        zIndex: 2,
      }}>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--teal)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          LIVE
        </span>
      </div>

      <div style={{ paddingLeft: 80, width: '100%', overflow: 'hidden' }}>
        <div className="ticker-track">
          {doubled.map((s, i) => (
            <TickerItem key={`${s.country}-${i}`} summary={s} />
          ))}
        </div>
      </div>

      {/* Fade right */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 40,
        background: 'linear-gradient(270deg, var(--bg-base), transparent)',
        zIndex: 2,
      }} />
    </div>
  )
})
