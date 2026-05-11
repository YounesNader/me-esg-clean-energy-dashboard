import { useEffect, useState } from 'react'
import { ApiError } from '../Components/UI/CountrySelector.jsx'
import RegionalHeatMatrix from '../Components/UI/RegionalHeatMatrix.jsx'
import { getTopPerformers, getAnomalies, getPolicyImpact, getOverview } from '../Api/apiClient.js'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer, Cell,
  BarChart, Bar
} from 'recharts'

const MEDALS = ['🥇', '🥈', '🥉']
const FLAGS  = {
  'Saudi Arabia':'🇸🇦', UAE:'🇦🇪', Qatar:'🇶🇦', Kuwait:'🇰🇼',
  Oman:'🇴🇲', Egypt:'🇪🇬', Bahrain:'🇧🇭', Jordan:'🇯🇴',
}
const COUNTRY_COLORS = {
  'Saudi Arabia':'#00d4aa', UAE:'#3b82f6', Qatar:'#10b981', Kuwait:'#a78bfa',
  Oman:'#fb923c', Egypt:'#fbbf24', Bahrain:'#f472b6', Jordan:'#86efac',
}

// Visual podium component
function Podium({ entries = [], title, valueLabel }) {
  const [first, second, third] = entries
  const podiumHeights = [120, 88, 72]
  const podiumColors  = ['#f59e0b', '#94a3b8', '#b45309']

  return (
    <div className="card" style={{ padding: 20, height: '100%' }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h3>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

      {/* Podium visual */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {/* 2nd place */}
        {second && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 18 }}>{FLAGS[second.country] || '🌍'}</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, maxWidth: 60, textAlign: 'center', lineHeight: 1.2 }}>
              {second.country}
            </span>
            <div style={{
              width: 64,
              height: podiumHeights[1],
              background: 'rgba(148,163,184,0.12)',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 8,
            }}>
              <span style={{ fontSize: 16 }}>🥈</span>
              <span style={{ fontFamily: '"Bebas Neue",sans-serif', fontSize: 12, color: podiumColors[1], marginTop: 4 }}>
                #{second.rank}
              </span>
            </div>
          </div>
        )}
        {/* 1st place */}
        {first && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 22 }}>{FLAGS[first.country] || '🌍'}</span>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, maxWidth: 70, textAlign: 'center', lineHeight: 1.2 }}>
              {first.country}
            </span>
            <div style={{
              width: 70,
              height: podiumHeights[0],
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 8,
            }}>
              <span style={{ fontSize: 20 }}>🥇</span>
              <span style={{
                fontFamily: '"IBM Plex Mono",monospace',
                fontSize: 10,
                color: '#f59e0b',
                marginTop: 6,
                fontWeight: 600,
              }}>
                {typeof first.value === 'number' ? first.value.toFixed(2) : first.value}
              </span>
            </div>
          </div>
        )}
        {/* 3rd place */}
        {third && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 18 }}>{FLAGS[third.country] || '🌍'}</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, maxWidth: 60, textAlign: 'center', lineHeight: 1.2 }}>
              {third.country}
            </span>
            <div style={{
              width: 60,
              height: podiumHeights[2],
              background: 'rgba(180,83,9,0.10)',
              border: '1px solid rgba(180,83,9,0.25)',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 8,
            }}>
              <span style={{ fontSize: 14 }}>🥉</span>
              <span style={{ fontFamily: '"Bebas Neue",sans-serif', fontSize: 12, color: podiumColors[2], marginTop: 4 }}>
                #{third.rank}
              </span>
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
        Ranked by {valueLabel}
      </p>
    </div>
  )
}

// Anomalies timeline
function AnomalyTimeline({ anomalies = [], count = 0, loading = false }) {
  const byYear = {}
  anomalies.forEach((a) => {
    if (!byYear[a.year]) byYear[a.year] = []
    byYear[a.year].push(a)
  })
  const years = Object.keys(byYear).sort()

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Anomaly Detection Timeline
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Z-score ≥ 2σ threshold · rolling 3-year baseline
          </p>
        </div>
        <span style={{
          fontSize: 10,
          fontFamily: '"IBM Plex Mono", monospace',
          padding: '3px 10px',
          borderRadius: 20,
          background: count > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
          color: count > 0 ? '#f59e0b' : '#10b981',
          border: `1px solid ${count > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        }}>
          {loading ? '…' : `${count} flagged`}
        </span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 60 }} />
      ) : anomalies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No anomalies detected in the dataset</p>
        </div>
      ) : (
        <>
          {/* Horizontal timeline */}
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 600, position: 'relative' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                top: 14,
                left: 0,
                right: 0,
                height: 2,
                background: 'rgba(255,255,255,0.06)',
              }} />

              {Array.from({ length: 10 }, (_, i) => 2015 + i).map((yr) => {
                const events = byYear[yr] || []
                const hasAnomaly = events.length > 0
                const maxZ = events.length ? Math.max(...events.map((e) => Math.abs(e.z_score))) : 0
                const dotColor = maxZ > 3 ? '#ef4444' : maxZ > 2.5 ? '#f59e0b' : 'rgba(255,255,255,0.15)'

                return (
                  <div key={yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Dot */}
                    <div
                      title={hasAnomaly ? events.map((e) => `${e.country}: ${e.z_score?.toFixed(2)}σ`).join('\n') : ''}
                      style={{
                        width: hasAnomaly ? 14 : 8,
                        height: hasAnomaly ? 14 : 8,
                        borderRadius: '50%',
                        background: hasAnomaly ? dotColor : 'rgba(255,255,255,0.15)',
                        border: hasAnomaly ? `2px solid ${dotColor}` : 'none',
                        boxShadow: hasAnomaly ? `0 0 8px ${dotColor}` : 'none',
                        zIndex: 1,
                        cursor: hasAnomaly ? 'help' : 'default',
                        marginBottom: 6,
                        transition: 'transform 0.15s',
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
                      {yr}
                    </span>
                    {hasAnomaly && (
                      <span style={{
                        fontSize: 8,
                        color: dotColor,
                        fontFamily: '"IBM Plex Mono", monospace',
                        marginTop: 2,
                        fontWeight: 600,
                      }}>
                        {events.map((e) => FLAGS[e.country] || '').join('')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Anomaly detail table */}
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Country', 'Year', 'ESG Budget', 'Z-Score', 'Deviation'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => {
                  const sev = Math.abs(a.z_score)
                  const zColor = sev > 3 ? '#ef4444' : sev > 2.5 ? '#f59e0b' : '#94a3b8'
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-primary)' }}>{FLAGS[a.country]} {a.country}</td>
                      <td style={{ color: 'var(--teal)' }}>{a.year}</td>
                      <td>${(a.esg_budget_usd_million || 0).toLocaleString()}M</td>
                      <td style={{ color: zColor, fontWeight: 600 }}>
                        {a.z_score > 0 ? '+' : ''}{a.z_score?.toFixed(2)}σ
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, maxWidth: 200 }} title={a.reason}>
                        {a.reason?.slice(0, 55)}{a.reason?.length > 55 ? '…' : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// Policy impact scatter plot
function PolicyScatter({ results = [], loading = false }) {
  if (loading) return <div className="skeleton" style={{ height: 260 }} />
  if (!results.length) return null

  const data = results.map((r) => ({
    country: r.country,
    x: r.policy_mean || 5,
    y: r.budget_mean || 0,
    r: Math.abs(r.correlation),
    fill: COUNTRY_COLORS[r.country] || 'var(--teal)',
    label: r.country,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="x" type="number" name="Policy Index"
          domain={[0, 10]}
          tick={{ fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
          axisLine={false} tickLine={false}
          label={{ value: 'Policy Index', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10 }}
        />
        <YAxis
          dataKey="y" type="number" name="ESG Budget"
          tickFormatter={(v) => `$${(v/1000).toFixed(0)}B`}
          tick={{ fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
          axisLine={false} tickLine={false} width={55}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div style={{
                background: '#16161f',
                border: `1px solid ${d.fill}40`,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                <div style={{ fontWeight: 600, color: d.fill, marginBottom: 4 }}>
                  {FLAGS[d.country]} {d.country}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Policy: {d.x?.toFixed(1)} · Budget: ${(d.y / 1000).toFixed(1)}B
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                  Correlation: {d.r?.toFixed(3)}
                </div>
              </div>
            )
          }}
        />
        <Scatter data={data} isAnimationActive>
          {data.map((d) => (
            <Cell key={d.country} fill={d.fill} fillOpacity={0.85} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default function Insights() {
  const [performers, setPerformers] = useState(null)
  const [anomalies,  setAnomalies]  = useState(null)
  const [policy,     setPolicy]     = useState(null)
  const [overview,   setOverview]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, a, pi, ov] = await Promise.all([
        getTopPerformers(),
        getAnomalies(),
        getPolicyImpact(),
        getOverview(),
      ])
      if (!p) { setError(true); setLoading(false); return }
      setPerformers(p)
      setAnomalies(a)
      setPolicy(pi)
      setOverview(ov)
      setLoading(false)
    }
    load()
  }, [])

  if (error) return <ApiError />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Podium — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }} className="page-enter">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, height: 280 }}>
              <div className="skeleton" style={{ height: '100%' }} />
            </div>
          ))
        ) : (
          <>
            <Podium entries={performers?.highest_esg_score_growth || []} title="🏆 ESG Score Growth" valueLabel="pts gained" />
            <Podium entries={performers?.highest_investment_efficiency || []} title="⚡ Investment Efficiency" valueLabel="RE/CO₂ ratio" />
            <Podium entries={performers?.highest_yoy_growth_3yr || []} title="📈 YoY Budget Growth (3yr)" valueLabel="% avg 2022–24" />
          </>
        )}
      </div>

      {/* Anomaly timeline */}
      <div className="page-enter-delay-1">
        <AnomalyTimeline
          anomalies={anomalies?.anomalies || []}
          count={anomalies?.anomaly_count || 0}
          loading={loading}
        />
      </div>

      {/* Policy scatter + insight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="page-enter-delay-2">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Policy Index vs ESG Budget
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
            Scatter plot · mean 2015–2024 values · bubble size = correlation |r|
          </p>
          <PolicyScatter results={policy?.results || []} loading={loading} />
          {!loading && policy?.results?.[0] && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'rgba(0,212,170,0.05)',
              border: '1px solid rgba(0,212,170,0.15)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              📌 <strong style={{ color: 'var(--teal)' }}>{policy.results[0].country}</strong> shows
              the strongest policy→budget correlation (r = {policy.results[0].correlation.toFixed(3)}).{' '}
              {policy.results[0].interpretation}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Policy Correlation Ranking
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
            |Pearson r| between policy_index and ESG budget · higher = stronger link
          </p>
          {loading ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(policy?.results || []).map((r) => ({
                  name: r.country,
                  r: Math.abs(r.correlation),
                  fill: COUNTRY_COLORS[r.country] || 'var(--teal)',
                }))}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 1]}
                  tick={{ fill: '#475569', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis type="category" dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [v.toFixed(3), 'Correlation |r|']}
                  contentStyle={{ background: '#16161f', border: '1px solid rgba(0,212,170,0.28)', borderRadius: 8 }}
                  labelStyle={{ color: '#00d4aa', fontWeight: 600 }}
                />
                <Bar dataKey="r" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {(policy?.results || []).map((r) => (
                    <Cell key={r.country} fill={COUNTRY_COLORS[r.country] || 'var(--teal)'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Regional heat matrix */}
      <div className="card page-enter-delay-3" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          Regional Heat Index
        </h3>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
          All 8 countries × 5 key metrics · colour-coded by relative magnitude
        </p>
        {loading
          ? <div className="skeleton" style={{ height: 220 }} />
          : <RegionalHeatMatrix summaries={overview?.country_summaries || []} />
        }
      </div>
    </div>
  )
}
