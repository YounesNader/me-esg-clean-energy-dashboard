import { memo } from 'react'

const METRICS = [
  { key: 'total_esg_budget_usd_million', label: 'ESG Budget',     fmt: (v) => `$${(v/1000).toFixed(2)}B` },
  { key: 'avg_esg_score',                label: 'Avg ESG Score',  fmt: (v) => v?.toFixed(1) },
  { key: 'total_re_investment_usd_million', label: 'RE Investment', fmt: (v) => `$${(v/1000).toFixed(2)}B` },
  { key: 'avg_policy_index',             label: 'Policy Index',   fmt: (v) => v?.toFixed(1) },
]

const ComparisonTable = memo(function ComparisonTable({ countryA, countryB, summaryA, summaryB }) {
  if (!summaryA || !summaryB) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 0, marginBottom: 4 }}>
        <div />
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--teal)',
          padding: '6px 0',
          background: 'rgba(0,212,170,0.06)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid var(--teal)',
        }}>
          {countryA}
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: '#f59e0b',
          padding: '6px 0',
          background: 'rgba(245,158,11,0.06)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #f59e0b',
          marginLeft: 4,
        }}>
          {countryB}
        </div>
      </div>

      {METRICS.map((m) => {
        const va = summaryA[m.key] || 0
        const vb = summaryB[m.key] || 0
        const aWins = va > vb
        return (
          <div
            key={m.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 140px',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 0', letterSpacing: '0.03em' }}>
              {m.label}
            </div>
            <div style={{
              textAlign: 'center',
              padding: '8px 0',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              fontWeight: aWins ? 600 : 400,
              color: aWins ? 'var(--teal)' : 'var(--text-secondary)',
              background: aWins ? 'rgba(0,212,170,0.05)' : 'transparent',
            }}>
              {m.fmt(va)}
              {aWins && <span style={{ marginLeft: 4, fontSize: 8 }}>▲</span>}
            </div>
            <div style={{
              textAlign: 'center',
              padding: '8px 0',
              marginLeft: 4,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              fontWeight: !aWins ? 600 : 400,
              color: !aWins ? '#f59e0b' : 'var(--text-secondary)',
              background: !aWins ? 'rgba(245,158,11,0.05)' : 'transparent',
            }}>
              {m.fmt(vb)}
              {!aWins && <span style={{ marginLeft: 4, fontSize: 8 }}>▲</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default ComparisonTable
