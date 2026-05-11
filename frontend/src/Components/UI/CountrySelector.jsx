// CountrySelector.jsx
import { useNavigate } from 'react-router-dom'

const COUNTRIES = [
  'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait',
  'Oman', 'Egypt', 'Bahrain', 'Jordan',
]

export function CountrySelector({ value, onChange, label = 'Country', className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm font-medium appearance-none cursor-pointer focus:outline-none"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(45,212,191,0.2)',
          color: 'var(--text-primary)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232dd4bf' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: '30px',
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c} value={c} style={{ background: '#0d1426' }}>{c}</option>
        ))}
      </select>
    </div>
  )
}

// LoadingSpinner — skeleton block grid
export function SkeletonBlock({ h = 'h-4', w = 'w-full', className = '' }) {
  return <div className={`skeleton ${h} ${w} ${className}`} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <SkeletonBlock h="h-3" w="w-20" />
            <SkeletonBlock h="h-8" w="w-28" />
            <SkeletonBlock h="h-3" w="w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5"><SkeletonBlock h="h-64" /></div>
        <div className="card p-5"><SkeletonBlock h="h-64" /></div>
      </div>
    </div>
  )
}

// ErrorBoundary
import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#fbbf24' }}>Something went wrong</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{this.state.error?.message}</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// EmptyState
export function EmptyState({ message = 'No data available', icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}

// ApiError
export function ApiError({ message = 'Failed to load data. Is the backend running?' }) {
  return (
    <div className="card p-5 flex items-center gap-3" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>API Error</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{message}</p>
      </div>
    </div>
  )
}
