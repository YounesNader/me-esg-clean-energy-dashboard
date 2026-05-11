import { memo } from 'react'

const ConfidenceMeter = memo(function ConfidenceMeter({ lower, upper, predicted }) {
  if (!lower || !upper || !predicted) return null

  const spread = upper - lower
  const relSpread = predicted > 0 ? (spread / predicted) * 100 : 0
  // Confidence: narrower band = higher confidence (cap at 100%)
  const confidence = Math.max(0, Math.min(100, 100 - relSpread * 1.2))

  const radius = 40
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const progress = (confidence / 100) * circumference

  const color = confidence > 70 ? '#10b981' : confidence > 45 ? '#00d4aa' : '#f59e0b'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        {/* Label */}
        <text
          x="50" y="46"
          textAnchor="middle"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 20,
            fill: color,
          }}
        >
          {Math.round(confidence)}%
        </text>
        <text
          x="50" y="60"
          textAnchor="middle"
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 7,
            fill: 'var(--text-muted)',
            letterSpacing: '0.06em',
          }}
        >
          CONFIDENCE
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}>
          Band Width
        </div>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}>
          ±${Math.round(spread / 2).toLocaleString()}M
        </div>
      </div>
    </div>
  )
})

export default ConfidenceMeter
