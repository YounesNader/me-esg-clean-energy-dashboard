import { useEffect, useState } from 'react'
import { CountrySelector, ApiError } from '../Components/UI/CountrySelector.jsx'
import ForecastChart from '../Components/Charts/ForecastChart.jsx'
import ScenarioCards from '../Components/UI/ScenarioCards.jsx'
import ConfidenceMeter from '../Components/UI/ConfidenceMeter.jsx'
import { getCountryForecast, getForecastCompare } from '../Api/apiClient.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer
} from 'recharts'

const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}
const COUNTRY_COLORS = {
  'Saudi Arabia': '#00d4aa', UAE: '#3b82f6', Qatar: '#10b981', Kuwait: '#a78bfa',
  Oman: '#fb923c', Egypt: '#fbbf24', Bahrain: '#f472b6', Jordan: '#86efac',
}

export default function Forecast() {
  const [country, setCountry] = useState('UAE')
  const [fcData,  setFcData]  = useState(null)
  const [compare, setCompare] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [fc, cmp] = await Promise.all([
        getCountryForecast(country),
        getForecastCompare(),
      ])
      if (!fc) { setError(true); setLoading(false); return }
      setFcData(fc)
      setCompare(cmp)
      setLoading(false)
    }
    load()
  }, [country])

  if (error) return <ApiError />

  const forecast   = fcData?.forecast || []
  const historical = fcData?.historical || []
  const fc2030     = forecast.find((f) => f.year === 2030)
  const fc2024actual = historical[historical.length - 1]
  const pctChange = fc2030 && fc2024actual
    ? ((fc2030.predicted_budget - fc2024actual.esg_budget_usd_million) / fc2024actual.esg_budget_usd_million * 100)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero + selector */}
      <div className="card card-accent-top page-enter" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Prophet ML Forecast · 2025–2030
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, marginRight: 2 }}>{FLAGS[country] || '🌍'}</span>
              <span style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 40,
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}>
                {country}
              </span>
              {fc2030 && (
                <span style={{
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: 32,
                  color: 'var(--teal)',
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                }}>
                  → ${(fc2030.predicted_budget / 1000).toFixed(1)}B by 2030
                </span>
              )}
            </div>
            {pctChange != null && (
              <div style={{
                marginTop: 6,
                fontSize: 12,
                color: pctChange > 0 ? '#10b981' : '#ef4444',
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 600,
              }}>
                {pctChange > 0 ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}% from 2024 baseline
              </div>
            )}
          </div>
          <CountrySelector value={country} onChange={setCountry} label="Country" />
        </div>
      </div>

      {/* Key milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }} className="page-enter-delay-1">
        {[2025, 2027, 2030].map((yr) => {
          const pt = forecast.find((f) => f.year === yr)
          return (
            <div key={yr} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg, var(--teal), transparent)', borderRadius: 1, marginBottom: 12 }} />
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 6 }}>
                {yr} Forecast
              </p>
              {loading
                ? <div className="skeleton" style={{ height: 32, margin: '0 auto', width: '60%' }} />
                : (
                  <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 28, color: 'var(--teal)', lineHeight: 1 }}>
                    {pt ? `$${(pt.predicted_budget / 1000).toFixed(1)}B` : '—'}
                  </p>
                )
              }
              {pt && !loading && (
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace', marginTop: 4 }}>
                  [{(pt.lower_bound/1000).toFixed(1)}B – {(pt.upper_bound/1000).toFixed(1)}B]
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Main forecast chart + confidence meter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12, alignItems: 'start' }} className="page-enter-delay-2">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {country} — ESG Budget Forecast 2025–2030
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
            Prophet · historical actuals (solid) + forecast (dashed) + 80% confidence band · TODAY reference line
          </p>
          {loading
            ? <div className="skeleton" style={{ height: 300 }} />
            : <ForecastChart historical={historical} forecast={forecast} country={country} height={300} />
          }
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 4 }}>
            Model Confidence
          </div>
          {fc2030 && !loading
            ? <ConfidenceMeter lower={fc2030.lower_bound} upper={fc2030.upper_bound} predicted={fc2030.predicted_budget} />
            : <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
          }
        </div>
      </div>

      {/* Scenario cards */}
      <div className="page-enter-delay-2">
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            2030 Scenario Analysis
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Bull / Base / Bear cases derived from Prophet confidence interval
          </p>
        </div>
        {loading
          ? <div className="skeleton" style={{ height: 100 }} />
          : <ScenarioCards forecast2030={fc2030} />
        }
      </div>

      {/* Forecast data table */}
      <div className="card page-enter-delay-3" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
          Predicted Values 2025–2030
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Year', 'Predicted', 'Lower Bound', 'Upper Bound', 'Band Width'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
                      ))}
                    </tr>
                  ))
                : forecast.map((row) => (
                    <tr key={row.year}>
                      <td style={{ color: 'var(--teal)', fontWeight: 600 }}>{row.year}</td>
                      <td style={{ color: 'var(--text-primary)' }}>${(row.predicted_budget || 0).toLocaleString()}M</td>
                      <td style={{ color: 'var(--text-secondary)' }}>${(row.lower_bound || 0).toLocaleString()}M</td>
                      <td style={{ color: 'var(--text-secondary)' }}>${(row.upper_bound || 0).toLocaleString()}M</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        ±${Math.round((row.upper_bound - row.lower_bound) / 2).toLocaleString()}M
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* All-countries 2030 bar */}
      {compare && (
        <div className="card page-enter-delay-4" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            All Countries — 2030 Forecast Comparison
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
            Predicted ESG budget by 2030 · sorted descending
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[...compare.countries]
                .sort((a, b) => b.predicted_2030 - a.predicted_2030)
                .map((c) => ({
                  name: c.country,
                  value: c.predicted_2030,
                  pct: c.pct_change_2024_2030,
                  fill: COUNTRY_COLORS[c.country] || 'var(--teal)',
                }))}
              layout="vertical"
              margin={{ top: 0, right: 80, bottom: 0, left: 110 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}B`}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                type="category" dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={(v, _, { payload }) => [
                  `$${(v || 0).toLocaleString()}M (+${payload.pct?.toFixed(1)}%)`,
                  '2030 Forecast',
                ]}
                contentStyle={{ background: '#16161f', border: '1px solid rgba(0,212,170,0.28)', borderRadius: 8 }}
                labelStyle={{ color: '#00d4aa', fontWeight: 600 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {compare.countries.map((c) => (
                  <Cell key={c.country} fill={COUNTRY_COLORS[c.country] || 'var(--teal)'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
