import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KPICard from '../Components/UI/KPICard.jsx'
import MarketTicker from '../Components/UI/MarketTicker.jsx'
import DataTable from '../Components/UI/DataTable.jsx'
import MEMap from '../Components/Charts/MEMap.jsx'
import { CountryBarChart } from '../Components/Charts/SectorPieChart.jsx'
import { SectorPieChart } from '../Components/Charts/SectorPieChart.jsx'
import TimeseriesChart from '../Components/Charts/TimeseriesChart.jsx'
import { ApiError } from '../Components/UI/CountrySelector.jsx'
import { getOverview, getTimeseries, getSectors } from '../Api/apiClient.js'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

export default function Overview() {
  const navigate = useNavigate()
  const [overview,   setOverview]   = useState(null)
  const [timeseries, setTimeseries] = useState(null)
  const [sectors,    setSectors]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ov, ts, sec] = await Promise.all([
        getOverview(),
        getTimeseries({ metric: 'esg_budget' }),
        getSectors(),
      ])
      if (!ov) { setError(true); setLoading(false); return }
      setOverview(ov)
      setTimeseries(ts)
      setSectors(sec)
      setLoading(false)
    }
    load()
  }, [])

  if (error) return <ApiError />

  const summaries  = overview?.country_summaries || []
  const totalInvest = summaries.reduce((s, c) => s + c.total_esg_budget_usd_million, 0)
  const avgESG      = summaries.length
    ? summaries.reduce((s, c) => s + c.avg_esg_score, 0) / summaries.length
    : 0
  const topPolicy   = summaries.length
    ? summaries.reduce((a, b) => a.avg_policy_index > b.avg_policy_index ? a : b, summaries[0])
    : null
  const totalGreenBonds = summaries.reduce((s, c) => s + (c.avg_green_bonds || 0) * 10, 0)

  // Build sparkline data per metric from timeseries
  const tsData = timeseries?.data || []
  const years  = [...new Set(tsData.map((d) => d.year))].sort()
  const globalByYear = years.map((yr) => ({
    value: tsData.filter((d) => d.year === yr).reduce((s, d) => s + (d.value || 0), 0),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Market ticker */}
      {!loading && summaries.length > 0 && (
        <div className="page-enter">
          <MarketTicker summaries={summaries} />
        </div>
      )}

      {/* KPI row — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }} className="page-enter">
        <KPICard
          label="Total ESG Investment"
          value={`$${(totalInvest / 1000).toFixed(1)}B`}
          sub="All 8 countries · 2015–2024"
          color="teal" loading={loading} delay={0}
          sparkData={globalByYear}
        />
        <KPICard
          label="Countries Covered"
          value={overview?.total_countries ?? 0}
          sub="Middle East region"
          color="blue" loading={loading} delay={50}
        />
        <KPICard
          label="Avg ESG Score 2024"
          value={avgESG.toFixed(1)}
          sub="Regional composite · 0–100"
          color="emerald" loading={loading} delay={100}
        />
        <KPICard
          label="Forecast Growth"
          value="~75%"
          sub="2024 → 2030 mean"
          color="amber" loading={loading} delay={150}
        />
        <KPICard
          label="Total Green Bonds"
          value={`$${(totalGreenBonds / 1000).toFixed(1)}B`}
          sub="Cumulative issuance"
          color="teal" loading={loading} delay={200}
        />
        <KPICard
          label="Highest Policy Score"
          value={topPolicy?.avg_policy_index?.toFixed(1) ?? '—'}
          sub={topPolicy ? topPolicy.country : 'Loading…'}
          color="emerald" loading={loading} delay={250}
        />
      </div>

      {/* ME Map + Sector Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }} className="page-enter-delay-1">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Middle East ESG Investment Map
            </h3>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Colour intensity = cumulative ESG budget · click a country to drill in
            </p>
          </div>
          {loading
            ? <div className="skeleton" style={{ height: 280 }} />
            : <MEMap summaries={summaries} onCountryClick={(c) => navigate(`/country/${encodeURIComponent(c)}`)} />
          }
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            RE Investment by Sector
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 14 }}>
            All countries · cumulative 2015–2024
          </p>
          <SectorPieChart sectors={sectors?.sectors || []} height={270} />
        </div>
      </div>

      {/* Country bar + Timeseries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }} className="page-enter-delay-2">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            ESG Budget by Country
          </h3>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 14 }}>
            Cumulative 2015–2024 · sorted descending
          </p>
          <CountryBarChart summaries={summaries} height={240} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                Regional ESG Investment Trend
              </h3>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Aggregate across all countries · 2015–2024
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { yr: 2015, label: 'Paris Agreement', color: '#3b82f6' },
                { yr: 2021, label: 'COP26', color: '#f59e0b' },
              ].map((ref) => (
                <div key={ref.yr} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 9, color: 'var(--text-muted)',
                }}>
                  <div style={{ width: 12, height: 2, background: ref.color, opacity: 0.7 }} />
                  {ref.label}
                </div>
              ))}
            </div>
          </div>
          <TimeseriesChart
            data={tsData}
            metric="esg_budget"
            gradient={false}
            height={240}
            referenceLines={[
              { x: 2015, label: 'Paris', color: '#3b82f6' },
              { x: 2021, label: 'COP26', color: '#f59e0b' },
            ]}
          />
        </div>
      </div>

      {/* Data table */}
      <div className="card page-enter-delay-3" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Country Rankings
            </h3>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Click column headers to sort · all 8 nations · 2015–2024
            </p>
          </div>
        </div>
        {loading
          ? <div className="skeleton" style={{ height: 200 }} />
          : <DataTable summaries={summaries} />
        }
      </div>
    </div>
  )
}
