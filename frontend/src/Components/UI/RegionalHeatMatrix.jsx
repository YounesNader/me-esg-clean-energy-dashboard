import { memo } from 'react'

const COUNTRIES = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Oman', 'Egypt', 'Bahrain', 'Jordan']
const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}
const METRICS = [
  { key: 'total_esg_budget_usd_million', label: 'ESG Budget',    fmt: (v) => `$${(v/1000).toFixed(1)}B` },
  { key: 'avg_esg_score',               label: 'ESG Score',     fmt: (v) => v?.toFixed(1) },
  { key: 'total_re_investment_usd_million', label: 'RE Invest',  fmt: (v) => `$${(v/1000).toFixed(1)}B` },
  { key: 'avg_policy_index',            label: 'Policy Idx',    fmt: (v) => v?.toFixed(1) },
  { key: 'yoy_growth',                  label: 'YoY Growth',    fmt: (v) => v != null ? `${v?.toFixed(1)}%` : '—' },
]

function heatColor(normalized) {
  // 0 = cold blue/purple, 1 = hot teal/green
  if (normalized > 0.75) return { bg: 'rgba(0,212,170,0.25)',  color: '#00d4aa' }
  if (normalized > 0.5)  return { bg: 'rgba(0,212,170,0.12)',  color: '#5ee9ca' }
  if (normalized > 0.25) return { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd' }
  return                        { bg: 'rgba(71,85,105,0.15)',   color: '#64748b' }
}

const RegionalHeatMatrix = memo(function RegionalHeatMatrix({ summaries = [] }) {
  if (!summaries.length) return null

  const byCountry = Object.fromEntries(summaries.map((s) => [s.country, s]))

  // Compute min/max per metric for normalization
  const ranges = {}
  METRICS.forEach((m) => {
    const vals = summaries.map((s) => s[m.key] || 0).filter((v) => v != null)
    ranges[m.key] = { min: Math.min(...vals), max: Math.max(...vals) }
  })

  const normalize = (key, val) => {
    const { min, max } = ranges[key]
    if (max === min) return 0.5
    return (val - min) / (max - min)
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px' }}>
        <thead>
          <tr>
            <th style={{
              textAlign: 'left',
              fontSize: 9,
              color: 'var(--text-muted)',
              padding: '0 8px 8px 0',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Country
            </th>
            {METRICS.map((m) => (
              <th key={m.key} style={{
                textAlign: 'center',
                fontSize: 9,
                color: 'var(--text-muted)',
                padding: '0 4px 8px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COUNTRIES.map((country) => {
            const s = byCountry[country]
            return (
              <tr key={country}>
                <td style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  padding: '3px 8px 3px 0',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}>
                  <span style={{ marginRight: 5 }}>{FLAGS[country]}</span>
                  {country}
                </td>
                {METRICS.map((m) => {
                  const val = s?.[m.key]
                  const norm = val != null ? normalize(m.key, val) : 0
                  const { bg, color } = heatColor(norm)
                  return (
                    <td key={m.key} style={{ padding: '3px 4px' }}>
                      <div
                        className="heat-cell"
                        style={{
                          background: bg,
                          color,
                          padding: '5px 8px',
                          minWidth: 72,
                          height: 32,
                        }}
                        title={`${country} · ${m.label}: ${m.fmt(val)}`}
                      >
                        {val != null ? m.fmt(val) : '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})

export default RegionalHeatMatrix
