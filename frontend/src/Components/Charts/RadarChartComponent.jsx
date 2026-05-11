import { memo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts'

const RadarChartComponent = memo(function RadarChartComponent({ summary, country, height = 260 }) {
  if (!summary) return <div style={{ height }} />

  const max = {
    esg_score:    100,
    policy_index: 10,
    re_ratio:     100,
    budget_scale: 100,
    yoy_growth:   50,
  }

  const reRatio = summary.total_re_investment_usd_million && summary.total_esg_budget_usd_million
    ? (summary.total_re_investment_usd_million / summary.total_esg_budget_usd_million) * 100
    : 0

  const budgetScale = Math.min(100, (summary.total_esg_budget_usd_million || 0) / 300)

  const data = [
    { metric: 'ESG Score',     value: Math.min(100, ((summary.avg_esg_score || 0) / max.esg_score) * 100) },
    { metric: 'Policy Index',  value: Math.min(100, ((summary.avg_policy_index || 0) / max.policy_index) * 100) },
    { metric: 'RE Ratio',      value: Math.min(100, reRatio) },
    { metric: 'Budget Scale',  value: Math.min(100, budgetScale) },
    { metric: 'YoY Growth',    value: Math.min(100, Math.max(0, ((summary.yoy_growth || 5) / max.yoy_growth) * 100)) },
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid
          stroke="rgba(255,255,255,0.07)"
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="metric"
          tick={{
            fill: '#94a3b8',
            fontSize: 10,
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{
                background: '#16161f',
                border: '1px solid rgba(0,212,170,0.25)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                <div style={{ color: '#00d4aa', fontWeight: 600, marginBottom: 4 }}>
                  {payload[0]?.payload?.metric}
                </div>
                <div style={{ color: '#f1f5f9' }}>
                  {Math.round(payload[0]?.value)}
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>/ 100</span>
                </div>
              </div>
            )
          }}
        />
        <Radar
          name={country}
          dataKey="value"
          stroke="#00d4aa"
          fill="#00d4aa"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3, fill: '#00d4aa', strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
})

export default RadarChartComponent
