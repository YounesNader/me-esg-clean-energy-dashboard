import { memo } from 'react'

const SCENARIOS = [
  {
    key:   'bull',
    label: 'Bull Case',
    icon:  '🚀',
    color: '#10b981',
    bg:    'rgba(16,185,129,0.08)',
    border:'rgba(16,185,129,0.25)',
    desc:  'Upper confidence bound — accelerated policy adoption + favourable macro',
  },
  {
    key:   'base',
    label: 'Base Case',
    icon:  '📊',
    color: '#00d4aa',
    bg:    'rgba(0,212,170,0.08)',
    border:'rgba(0,212,170,0.25)',
    desc:  'Predicted value — Prophet model central estimate',
  },
  {
    key:   'bear',
    label: 'Bear Case',
    icon:  '⚠️',
    color: '#f59e0b',
    bg:    'rgba(245,158,11,0.08)',
    border:'rgba(245,158,11,0.25)',
    desc:  'Lower confidence bound — policy delays + macro headwinds',
  },
]

const ScenarioCards = memo(function ScenarioCards({ forecast2030 }) {
  if (!forecast2030) return null

  const { upper_bound, predicted_budget, lower_bound } = forecast2030
  const values = { bull: upper_bound, base: predicted_budget, bear: lower_bound }

  const fmt = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v).toLocaleString()}M`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {SCENARIOS.map((s) => (
        <div
          key={s.key}
          className="card p-4"
          style={{ background: s.bg, borderColor: s.border }}
        >
          <div style={{ height: 2, background: s.color, borderRadius: 1, marginBottom: 12, opacity: 0.7 }} />
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: s.color,
            }}>
              {s.label}
            </span>
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 32,
            color: s.color,
            lineHeight: 1,
            marginBottom: 6,
          }}>
            {fmt(values[s.key] || 0)}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {s.desc}
          </p>
        </div>
      ))}
    </div>
  )
})

export default ScenarioCards
