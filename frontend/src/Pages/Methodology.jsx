import { getModelInfo } from '../Api/apiClient.js'
import { useEffect, useState } from 'react'

function Badge({ label, color = '#00d4aa', bg = 'rgba(0,212,170,0.08)' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      marginRight: 6,
      marginBottom: 6,
      background: bg,
      color,
      border: `1px solid ${color}35`,
    }}>
      {label}
    </span>
  )
}

function ProgressBar({ label, val, max = 1, color = '#00d4aa' }) {
  const pct = Math.min(100, (val / max) * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color, fontWeight: 600 }}>
          {typeof val === 'number' && val < 1 ? val.toFixed(3) : val.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
          borderRadius: 3,
          transition: 'width 1.2s ease',
        }} />
      </div>
    </div>
  )
}

// SVG architecture diagram
function ArchDiagram() {
  const boxes = [
    { id: 'raw',      x: 30,  y: 30,  w: 120, h: 44, label: 'Raw Data',         sub: 'generate_data.py',  color: '#475569' },
    { id: 'loader',   x: 220, y: 30,  w: 130, h: 44, label: 'ESGDataLoader',    sub: 'data_loader.py',    color: '#3b82f6' },
    { id: 'models',   x: 420, y: 30,  w: 130, h: 44, label: 'ML Models',        sub: 'Ridge + Prophet',   color: '#a78bfa' },
    { id: 'fastapi',  x: 220, y: 130, w: 130, h: 44, label: 'FastAPI',          sub: '3 routers',         color: '#00d4aa' },
    { id: 'react',    x: 420, y: 130, w: 130, h: 44, label: 'React Frontend',   sub: 'Vite + Recharts',   color: '#10b981' },
    { id: 'user',     x: 620, y: 130, w: 100, h: 44, label: 'User',             sub: 'Browser',           color: '#f59e0b' },
  ]

  const arrows = [
    { from: [150, 52],  to: [220, 52]  },
    { from: [350, 52],  to: [420, 52]  },
    { from: [285, 74],  to: [285, 130] },
    { from: [420, 52],  to: [350, 130] },
    { from: [550, 152], to: [620, 152] },
  ]

  return (
    <svg viewBox="0 0 760 200" style={{ width: '100%', maxHeight: 200 }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.25)" />
        </marker>
      </defs>

      {arrows.map((a, i) => (
        <line
          key={i}
          x1={a.from[0]} y1={a.from[1]}
          x2={a.to[0]}   y2={a.to[1]}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#arrowhead)"
        />
      ))}

      {boxes.map((b) => (
        <g key={b.id}>
          <rect
            x={b.x} y={b.y} width={b.w} height={b.h}
            rx="8"
            fill={`${b.color}12`}
            stroke={`${b.color}40`}
            strokeWidth="1"
          />
          <text x={b.x + b.w / 2} y={b.y + 17} textAnchor="middle" style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 11,
            fontWeight: 600,
            fill: b.color,
          }}>
            {b.label}
          </text>
          <text x={b.x + b.w / 2} y={b.y + 31} textAnchor="middle" style={{
            fontFamily: '"IBM Plex Mono", sans-serif',
            fontSize: 9,
            fill: 'rgba(255,255,255,0.4)',
          }}>
            {b.sub}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Methodology() {
  const [modelInfo, setModelInfo] = useState(null)

  useEffect(() => {
    getModelInfo().then(setModelInfo)
  }, [])

  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero */}
      <div className="card page-enter" style={{ padding: 32, background: 'linear-gradient(135deg, rgba(0,212,170,0.06) 0%, rgba(59,130,246,0.06) 100%)' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--teal), var(--blue), transparent 80%)', borderRadius: 1, marginBottom: 20 }} />
        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 36, letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
          Project Methodology
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 680 }}>
          Architecture, data sources, machine learning models, and technology choices behind
          the Middle East ESG & Clean Energy Analytics Platform.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: '8 Countries', color: '#00d4aa' },
            { label: '10 Years (2015–2024)', color: '#3b82f6' },
            { label: 'Prophet ML Forecasts', color: '#a78bfa' },
            { label: '2030 Horizon', color: '#f59e0b' },
          ].map((t) => (
            <Badge key={t.label} label={t.label} color={t.color} bg={`${t.color}12`} />
          ))}
        </div>
      </div>

      {/* Overview */}
      <div className="card page-enter-delay-1" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 12 }}>
          Project Overview
        </h2>
        <div style={{ height: 1, background: 'rgba(0,212,170,0.15)', marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
          This dashboard tracks sovereign and corporate ESG (Environmental, Social & Governance) clean energy investment
          across 8 Middle Eastern nations — <strong style={{ color: 'var(--text-primary)' }}>Saudi Arabia, UAE, Qatar, Kuwait, Oman, Egypt, Bahrain,
          and Jordan</strong> — from 2015 through 2024, with ML-powered forecasts projected to 2030.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          The Middle East faces an acute climate-versus-economy tension: the world's largest hydrocarbon exporters
          are simultaneously among the regions most physically exposed to climate change. National visions
          (Vision 2030, UAE Net Zero 2050) have embedded ESG targets into sovereign investment mandates.
        </p>
      </div>

      {/* Architecture diagram */}
      <div className="card page-enter-delay-1" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 12 }}>
          System Architecture
        </h2>
        <div style={{ height: 1, background: 'rgba(0,212,170,0.15)', marginBottom: 20 }} />
        <ArchDiagram />
      </div>

      {/* Data Sources */}
      <div className="card page-enter-delay-2" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 12 }}>
          Data Sources & Pipeline
        </h2>
        <div style={{ height: 1, background: 'rgba(0,212,170,0.15)', marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
          The dataset is{' '}
          <strong style={{ color: 'var(--text-primary)' }}>synthetic but calibrated</strong> — generated via{' '}
          <code style={{ fontFamily: '"IBM Plex Mono"', fontSize: 12, background: 'rgba(0,212,170,0.1)', color: 'var(--teal)', padding: '1px 6px', borderRadius: 4 }}>
            generate_data.py
          </code>{' '}
          using base parameters drawn from public sources (World Bank, IEA, regional budget reports).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Dataset Size', val: '80 observations (8 × 10 years)' },
            { label: 'Cleaning',     val: 'Column normalisation + forward-fill by country group' },
            { label: 'Derived vars', val: 'esg_budget_per_gdp, yoy_growth, investment_efficiency' },
            { label: 'Noise model',  val: 'Multiplicative — variance scales with magnitude' },
          ].map(({ label, val }) => (
            <div key={label} style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ML Models */}
      <div className="card page-enter-delay-2" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 12 }}>
          Machine Learning Models
        </h2>
        <div style={{ height: 1, background: 'rgba(0,212,170,0.15)', marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 14 }}>
              Sklearn — Budget Prediction
            </p>
            <ProgressBar label="Ridge Regression R²" val={modelInfo?.ridge_r2 || 0.862} max={1} color="#00d4aa" />
            <ProgressBar label="Random Forest R²"    val={modelInfo?.rf_r2 || 0.649}    max={1} color="#3b82f6" />
            <ProgressBar label="Ridge RMSE (lower = better)" val={modelInfo?.ridge_rmse || 1317} max={3000} color="#10b981" />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
              Ridge won. With only 40 training rows and correlated lag features, Random Forest overfits.
              Ridge's L2 penalty handles multicollinearity on the small panel dataset.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 14 }}>
              Prophet — Time Series Forecast
            </p>
            {[
              { label: 'Models trained', val: '8', max: 8, color: '#a78bfa' },
              { label: 'Forecast horizon', val: '6', max: 10, color: '#f59e0b' },
              { label: 'Confidence level', val: '0.80', max: 1, color: '#00d4aa' },
            ].map(({ label, val, max, color }) => (
              <ProgressBar key={label} label={label} val={parseFloat(val)} max={max} color={color} />
            ))}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
              Prophet detects structural changepoints (COP26 2021) automatically. One model per country
              respects heterogeneous trajectories that a pooled model would average away.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="card page-enter-delay-3" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 12 }}>
          Technology Stack
        </h2>
        <div style={{ height: 1, background: 'rgba(0,212,170,0.15)', marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 10 }}>Backend</p>
            {['Python 3.11', 'FastAPI', 'Scikit-learn', 'Prophet', 'Pandas', 'NumPy', 'SciPy', 'Joblib'].map((t) => (
              <Badge key={t} label={t} color="#00d4aa" bg="rgba(0,212,170,0.07)" />
            ))}
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 10 }}>Frontend</p>
            {['React 18', 'Recharts', 'Tailwind CSS', 'React Router v6', 'Axios', 'Vite 5'].map((t) => (
              <Badge key={t} label={t} color="#3b82f6" bg="rgba(59,130,246,0.07)" />
            ))}
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 10 }}>Infrastructure</p>
            {['Uvicorn', 'Streamlit', 'Jupyter', 'Docker'].map((t) => (
              <Badge key={t} label={t} color="#a78bfa" bg="rgba(167,139,250,0.07)" />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a
            href="https://github.com/yourusername/me-esg-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            <GithubIcon />
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  )
}
