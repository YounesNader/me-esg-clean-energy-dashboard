import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const http = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — strip .data wrapper
http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err)
)

async function safe(fn) {
  try { return await fn() }
  catch (e) { console.error('[API]', e.message); return null }
}

// ── Root ──────────────────────────────────────────────────────────────────────
export const pingApi    = () => safe(() => http.get('/'))

// ── /api/data ────────────────────────────────────────────────────────────────
export const getCountries  = () => safe(() => http.get('/api/data/countries'))

export const getOverview   = (country = null) =>
  safe(() => http.get('/api/data/overview', { params: country ? { country } : {} }))

export const getTimeseries = ({ country = null, metric = 'esg_budget', start_year = 2015, end_year = 2024 } = {}) =>
  safe(() => http.get('/api/data/timeseries', {
    params: { metric, start_year, end_year, ...(country ? { country } : {}) },
  }))

export const getHeatmap    = (country = null) =>
  safe(() => http.get('/api/data/heatmap', { params: country ? { country } : {} }))

export const getSectors    = (country = null) =>
  safe(() => http.get('/api/data/sectors', { params: country ? { country } : {} }))

// ── /api/forecast ─────────────────────────────────────────────────────────────
export const getForecastCompare = () => safe(() => http.get('/api/forecast/compare'))
export const getModelInfo       = () => safe(() => http.get('/api/forecast/model-info'))
export const getCountryForecast = (country) =>
  safe(() => http.get(`/api/forecast/${encodeURIComponent(country)}`))

// ── /api/insights ─────────────────────────────────────────────────────────────
export const getTopPerformers = () => safe(() => http.get('/api/insights/top-performers'))
export const getAnomalies     = () => safe(() => http.get('/api/insights/anomalies'))
export const getPolicyImpact  = () => safe(() => http.get('/api/insights/policy-impact'))
