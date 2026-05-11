import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import KPICard from '../Components/UI/KPICard.jsx'
import ComparisonTable from '../Components/UI/ComparisonTable.jsx'
import { CountrySelector } from '../Components/UI/CountrySelector.jsx'
import { ApiError } from '../Components/UI/CountrySelector.jsx'
import TimeseriesChart from '../Components/Charts/TimeseriesChart.jsx'
import { SectorPieChart } from '../Components/Charts/SectorPieChart.jsx'
import RadarChartComponent from '../Components/Charts/RadarChartComponent.jsx'
import { getOverview, getTimeseries, getSectors } from '../Api/apiClient.js'

const METRICS = [
  { value: 'esg_budget',           label: 'ESG Budget'        },
  { value: 'renewable_investment', label: 'RE Investment'      },
  { value: 'esg_score',            label: 'ESG Score'         },
  { value: 'carbon_emissions',     label: 'Carbon Emissions'  },
  { value: 'green_bonds',          label: 'Green Bonds'       },
]
const COUNTRIES = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Oman', 'Egypt', 'Bahrain', 'Jordan']
const TABS = ['Overview', 'Trends', 'Sectors', 'Comparison']
const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}

export default function CountryView() {
  const { countryName } = useParams()
  const navigate = useNavigate()

  const [country,    setCountry]    = useState(countryName || 'UAE')
  const [metric,     setMetric]     = useState('esg_budget')
  const [compare,    setCompare]    = useState(null)
  const [activeTab,  setActiveTab]  = useState('Overview')
  const [overview,   setOverview]   = useState(null)
  const [cmpOverview,setCmpOverview]= useState(null)
  const [tsData,     setTsData]     = useState(null)
  const [tsCmpData,  setTsCmpData]  = useState(null)
  const [sectors,    setSectors]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)

  useEffect(() => {
    navigate(`/country/${encodeURIComponent(country)}`, { replace: true })
  }, [country])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ov, ts, sec] = await Promise.all([
        getOverview(country),
        getTimeseries({ country, metric }),
        getSectors(country),
      ])
      if (!ov) { setError(true); setLoading(false); return }
      setOverview(ov)
      setTsData(ts)
      setSectors(sec)
      setLoading(false)
    }
    load()
  }, [country, metric])

  useEffect(() => {
    if (!compare) { setTsCmpData(null); setCmpOverview(null); return }
    Promise.all([
      getTimeseries({ country: compare, metric }),
      getOverview(compare),
    ]).then(([ts, ov]) => {
      setTsCmpData(ts)
      setCmpOverview(ov)
    })
  }, [compare, metric])

  if (error) return <ApiError />

  const summary    = overview?.country_summaries?.[0]
  const cmpSummary = cmpOverview?.country_summaries?.[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }} className="page-enter">
        <CountrySelector value={country} onChange={setCountry} label="Country" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Metric
          </label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Compare With
          </label>
          <select
            value={compare || ''}
            onChange={(e) => setCompare(e.target.value || null)}
            style={{ borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <option value="">— None —</option>
            {COUNTRIES.filter((c) => c !== country).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Split layout: profile (30%) + content (70%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }} className="page-enter-delay-1">

        {/* Left panel — Country Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            {/* Flag + name */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>{FLAGS[country] || '🌍'}</div>
              <div style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 22,
                letterSpacing: '0.08em',
                color: 'var(--text-primary)',
              }}>
                {country}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                Middle East · ESG Profile
              </div>
            </div>

            {/* Stats list */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 28 }} />
                ))}
              </div>
            ) : summary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Total ESG Budget', val: `$${(summary.total_esg_budget_usd_million/1000).toFixed(2)}B`, color: 'var(--teal)' },
                  { label: 'Avg ESG Score', val: summary.avg_esg_score?.toFixed(1), color: '#10b981' },
                  { label: 'RE Investment', val: `$${(summary.total_re_investment_usd_million/1000).toFixed(2)}B`, color: '#3b82f6' },
                  { label: 'Avg Policy Index', val: summary.avg_policy_index?.toFixed(1), color: '#f59e0b' },
                  { label: 'Data Range', val: `${summary.earliest_year}–${summary.latest_year}`, color: 'var(--text-secondary)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 12,
                      fontWeight: 600,
                      color,
                    }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radar chart */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Profile Radar
            </h4>
            <RadarChartComponent summary={summary} country={country} height={220} />
          </div>
        </div>

        {/* Right panel — content based on active tab */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* KPI strip — always visible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <KPICard label="Total Investment"  value={`$${((summary?.total_esg_budget_usd_million||0)/1000).toFixed(2)}B`} sub="2015–2024"          color="teal"    loading={loading} />
            <KPICard label="Avg ESG Score"     value={summary?.avg_esg_score?.toFixed(1) || 0}                              sub="Composite 0–100"   color="emerald" loading={loading} delay={50} />
            <KPICard label="RE Investment"     value={`$${((summary?.total_re_investment_usd_million||0)/1000).toFixed(2)}B`} sub="Cumulative"       color="blue"    loading={loading} delay={100} />
            <KPICard label="Avg Policy Index"  value={summary?.avg_policy_index?.toFixed(1) || 0}                           sub="Scale 0–10"        color="amber"   loading={loading} delay={150} />
            <KPICard label="Data Years"        value={`${summary?.earliest_year || 2015}–${summary?.latest_year || 2024}`}  sub="Coverage"          color="teal"    loading={loading} delay={200} />
          </div>

          {/* Tab content */}
          {(activeTab === 'Overview' || activeTab === 'Trends') && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {country} — {METRICS.find((m) => m.value === metric)?.label}
              </h3>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
                Annual data 2015–2024
              </p>
              {loading
                ? <div className="skeleton" style={{ height: 260 }} />
                : <TimeseriesChart data={tsData?.data || []} metric={metric} gradient height={260} />
              }
            </div>
          )}

          {activeTab === 'Sectors' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {country} — RE Investment by Sector
              </h3>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
                Cumulative 2015–2024 · five RE sectors
              </p>
              <SectorPieChart sectors={sectors?.sectors || []} height={300} />
            </div>
          )}

          {activeTab === 'Comparison' && compare && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>{FLAGS[country]}</span>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: 'var(--teal)', letterSpacing: '0.06em' }}>{country}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>VS</span>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: '#f59e0b', letterSpacing: '0.06em' }}>{compare}</span>
                <span style={{ fontSize: 20 }}>{FLAGS[compare]}</span>
              </div>
              <ComparisonTable
                countryA={country} countryB={compare}
                summaryA={summary} summaryB={cmpSummary}
              />
              {/* Side-by-side timeseries */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>{country}</p>
                  <TimeseriesChart data={tsData?.data || []} metric={metric} gradient height={180} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>{compare}</p>
                  <TimeseriesChart data={tsCmpData?.data || []} metric={metric} gradient height={180} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Comparison' && !compare && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚖️</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Select a country to compare using the "Compare With" dropdown above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
