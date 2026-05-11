import { memo } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
  Brush,
} from 'recharts'

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
const FALLBACK = ['#00d4aa','#3b82f6','#10b981','#a78bfa','#fb923c','#fbbf24','#f472b6','#86efac']

function formatY(v) {
  if (v >= 1000) return `$${(v/1000).toFixed(1)}B`
  return `$${v.toLocaleString()}M`
}

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#16161f',
      border: '1px solid rgba(0,212,170,0.28)',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 160,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      <p style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        fontWeight: 600,
        color: '#00d4aa',
        marginBottom: 8,
      }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: 11,
          marginBottom: 3,
        }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            color: '#f1f5f9',
            fontWeight: 600,
          }}>
            {metric === 'esg_score' ? (p.value?.toFixed(1)) : `$${(p.value || 0).toLocaleString()}M`}
          </span>
        </div>
      ))}
    </div>
  )
}

const TimeseriesChart = memo(function TimeseriesChart({
  data = [], metric = 'esg_budget', gradient = false, height = 280,
  referenceLines = [], showBrush = false,
}) {
  if (!data?.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No data available</p>
    </div>
  )

  const countries = [...new Set(data.map((d) => d.country))]
  const years     = [...new Set(data.map((d) => d.year))].sort()

  const pivoted = years.map((yr) => {
    const row = { year: yr }
    countries.forEach((c) => {
      const pt = data.find((d) => d.year === yr && d.country === c)
      row[c] = pt?.value ?? null
    })
    return row
  })

  const isSingleCountry = countries.length === 1

  const sharedProps = {
    data: pivoted,
    margin: { top: 8, right: 8, bottom: showBrush ? 24 : 4, left: 0 },
  }

  const axisProps = {
    tick: { fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' },
    axisLine: false,
    tickLine: false,
  }

  const refLines = referenceLines.map((ref) => (
    <ReferenceLine
      key={ref.x}
      x={ref.x}
      stroke={ref.color || 'rgba(255,255,255,0.25)'}
      strokeDasharray="4 3"
      strokeWidth={1.2}
      label={{ value: ref.label, fill: ref.color || '#94a3b8', fontSize: 9, position: 'insideTopLeft' }}
    />
  ))

  const brush = showBrush ? (
    <Brush
      dataKey="year" height={20} stroke="rgba(0,212,170,0.2)"
      fill="rgba(0,212,170,0.05)"
      travellerWidth={6}
    />
  ) : null

  if (gradient && isSingleCountry) {
    const c     = countries[0]
    const color = COUNTRY_COLORS[c] || FALLBACK[0]
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart {...sharedProps}>
          <defs>
            <linearGradient id={`tsGrad_${c.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis
            tickFormatter={metric === 'esg_score' ? (v) => v : formatY}
            width={60} {...axisProps}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          {refLines}
          <Area
            type="monotone" dataKey={c}
            stroke={color} strokeWidth={2.2}
            fill={`url(#tsGrad_${c.replace(/\s/g,'')})`}
            dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5.5, fill: color }}
          />
          {brush}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart {...sharedProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis
          tickFormatter={metric === 'esg_score' ? (v) => v : formatY}
          width={60} {...axisProps}
        />
        <Tooltip content={<CustomTooltip metric={metric} />} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
        {refLines}
        {countries.map((c, i) => (
          <Line
            key={c} type="monotone" dataKey={c}
            stroke={COUNTRY_COLORS[c] || FALLBACK[i % FALLBACK.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
        {brush}
      </LineChart>
    </ResponsiveContainer>
  )
})

export default TimeseriesChart
