// SectorPieChart.jsx + CountryBarChart.jsx — combined file
import { memo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell as RCell, ResponsiveContainer as RC } from 'recharts'

const SECTOR_COLORS = {
  'Solar':              '#fbbf24',
  'Wind':               '#00d4aa',
  'Hydrogen':           '#3b82f6',
  'Grid Infrastructure':'#a78bfa',
  'Carbon Capture':     '#fb923c',
}

const COUNTRY_COLORS = {
  'Saudi Arabia': '#00d4aa',
  'UAE':          '#3b82f6',
  'Qatar':        '#10b981',
  'Kuwait':       '#a78bfa',
  'Oman':         '#fb923c',
  'Egypt':        '#fbbf24',
  'Bahrain':      '#f472b6',
  'Jordan':       '#86efac',
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: '#16161f',
      border: `1px solid ${d.payload.fill}40`,
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      <p style={{ fontWeight: 600, color: d.payload.fill, marginBottom: 4, fontFamily: '"IBM Plex Mono", monospace' }}>
        {d.name}
      </p>
      <p style={{ color: '#f1f5f9', fontFamily: '"IBM Plex Mono", monospace' }}>
        ${(d.value || 0).toLocaleString()}M
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>
        {d.payload.percent}%
      </p>
    </div>
  )
}

export const SectorPieChart = memo(function SectorPieChart({ sectors = [], height = 280 }) {
  if (!sectors.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No sector data</p>
    </div>
  )

  const total = sectors.reduce((s, d) => s + d.total_re_investment_usd_million, 0)
  const data  = sectors.map((s) => ({
    name:    s.sector,
    value:   s.total_re_investment_usd_million,
    percent: ((s.total_re_investment_usd_million / total) * 100).toFixed(1),
    fill:    SECTOR_COLORS[s.sector] || '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="44%"
          innerRadius="50%" outerRadius="70%"
          dataKey="value" paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((d) => <Cell key={d.name} fill={d.fill} opacity={0.9} />)}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          formatter={(v) => (
            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: '"IBM Plex Sans", sans-serif' }}>{v}</span>
          )}
          wrapperStyle={{ paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
})

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: '#16161f',
      border: `1px solid ${d.payload.fill}40`,
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      <p style={{ fontWeight: 600, color: d.payload.fill, marginBottom: 4 }}>{d.payload.country}</p>
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', color: '#f1f5f9' }}>
        ${(d.value || 0).toLocaleString()}M
      </p>
    </div>
  )
}

export const CountryBarChart = memo(function CountryBarChart({ summaries = [], height = 280 }) {
  if (!summaries.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No data</p>
    </div>
  )

  const data = [...summaries]
    .sort((a, b) => b.total_esg_budget_usd_million - a.total_esg_budget_usd_million)
    .map((s) => ({
      country: s.country,
      value:   s.total_esg_budget_usd_million,
      fill:    COUNTRY_COLORS[s.country] || '#00d4aa',
    }))

  return (
    <RC width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 90 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}B` : `$${v}M`}
          tick={{ fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          type="category" dataKey="country"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false} tickLine={false}
        />
        <RTooltip content={<BarTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d) => <RCell key={d.country} fill={d.fill} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </RC>
  )
})
