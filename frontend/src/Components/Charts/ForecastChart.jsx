import { memo } from 'react'
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const relevant = payload.filter((p) => p.value != null && !['upper','lower'].includes(p.dataKey))
  return (
    <div style={{
      background: '#16161f',
      border: '1px solid rgba(0,212,170,0.28)',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 190,
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
      {relevant.map((p) => (
        <div key={p.name} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: 11,
          marginBottom: 4,
        }}>
          <span style={{ color: p.color || '#94a3b8' }}>{p.name}</span>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            color: '#f1f5f9',
            fontWeight: 600,
          }}>
            ${(p.value || 0).toLocaleString()}M
          </span>
        </div>
      ))}
      {/* Show confidence band if forecast year */}
      {payload.find((p) => p.dataKey === 'upper') && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10,
          color: '#475569',
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          Band: [{payload.find(p=>p.dataKey==='lower')?.value?.toLocaleString()} –{' '}
          {payload.find(p=>p.dataKey==='upper')?.value?.toLocaleString()}]M
        </div>
      )}
    </div>
  )
}

const ForecastChart = memo(function ForecastChart({
  historical = [], forecast = [], country = '', height = 340,
}) {
  if (!historical.length && !forecast.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No forecast data</p>
      </div>
    )
  }

  const histMap = Object.fromEntries(historical.map((h) => [h.year, h.esg_budget_usd_million]))
  const allYears = [...new Set([...historical.map((h) => h.year), ...forecast.map((f) => f.year)])].sort()

  const chartData = allYears.map((yr) => {
    const fc = forecast.find((f) => f.year === yr)
    return {
      year: yr,
      actual:    histMap[yr] ?? null,
      predicted: fc?.predicted_budget ?? null,
      upper:     fc?.upper_bound ?? null,
      lower:     fc?.lower_bound ?? null,
    }
  })

  const currentYear = new Date().getFullYear()
  const axisProps = {
    tick: { fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' },
    axisLine: false,
    tickLine: false,
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00d4aa" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.04} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis
          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v}M`}
          width={65} {...axisProps}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

        {/* 2024 / last-actual boundary */}
        <ReferenceLine
          x={2024}
          stroke="rgba(245,158,11,0.45)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: '2024', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
        />

        {/* TODAY line */}
        {currentYear >= 2025 && currentYear <= 2030 && (
          <ReferenceLine
            x={currentYear}
            stroke="rgba(239,68,68,0.5)"
            strokeDasharray="3 3"
            strokeWidth={1.2}
            label={{ value: 'TODAY', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }}
          />
        )}

        {/* COP26 marker */}
        <ReferenceLine
          x={2021}
          stroke="rgba(59,130,246,0.3)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ value: 'COP26', fill: '#3b82f6', fontSize: 8, position: 'insideTopLeft' }}
        />

        {/* Confidence band */}
        <Area
          dataKey="upper"
          name="Upper Bound"
          stroke="none"
          fill="url(#confBandGrad)"
          legendType="none"
          connectNulls
          dot={false}
        />
        <Area
          dataKey="lower"
          name="Lower Bound"
          stroke="none"
          fill="var(--bg-base)"
          legendType="none"
          connectNulls
          dot={false}
        />

        {/* Forecast line (dashed teal) */}
        <Line
          dataKey="predicted"
          name="Forecast"
          stroke="#00d4aa"
          strokeWidth={2.2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 5, fill: '#00d4aa', strokeWidth: 0 }}
          connectNulls
        />

        {/* Historical actuals (solid, emerald) */}
        <Line
          dataKey="actual"
          name="Actual"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
})

export default ForecastChart
