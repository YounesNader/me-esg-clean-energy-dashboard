import { useState } from 'react'

function lerp(a, b, t) { return a + (b - a) * t }

function corrToColor(value) {
  const v = Math.max(-1, Math.min(1, value))
  const neg = [239, 68, 68]
  const mid = [17, 24, 39]
  const pos = [45, 212, 191]
  let rgb
  if (v < 0) {
    const t = v + 1
    rgb = neg.map((c, i) => Math.round(lerp(c, mid[i], t)))
  } else {
    const t = v
    rgb = mid.map((c, i) => Math.round(lerp(c, pos[i], t)))
  }
  return `rgb(${rgb.join(',')})`
}

export default function CorrelationHeatmap({ columns = [], matrix = {}, height = 420 }) {
  const [hovered, setHovered] = useState(null)

  if (!columns.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No heatmap data</p>
      </div>
    )
  }

  const n = columns.length
  const cellSize = Math.min(44, Math.floor((height - 60) / n))
  const labelW = 95
  const totalW = labelW + n * cellSize + 10
  const totalH = 34 + n * cellSize

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={totalW} height={totalH} style={{ fontFamily: "'DM Sans',sans-serif", display: 'block' }}>
          {/* Column headers */}
          {columns.map((col, ci) => (
            <text key={`col-${ci}`}
              x={labelW + ci * cellSize + cellSize / 2} y={26}
              textAnchor="start" fill="#4a6080" fontSize={9}
              transform={`rotate(-35,${labelW + ci * cellSize + cellSize / 2},26)`}
            >
              {col.length > 11 ? col.slice(0, 11) + '…' : col}
            </text>
          ))}

          {/* Rows */}
          {columns.map((row, ri) => (
            <g key={`row-${ri}`}>
              <text x={labelW - 5} y={34 + ri * cellSize + cellSize / 2 + 4}
                textAnchor="end" fill="#8499b8" fontSize={9}>
                {row.length > 13 ? row.slice(0, 13) + '…' : row}
              </text>
              {columns.map((col, ci) => {
                const val = matrix[row]?.[col] ?? 0
                const isHov = hovered?.r === ri && hovered?.c === ci
                return (
                  <g key={`${ri}-${ci}`}>
                    <rect
                      x={labelW + ci * cellSize} y={34 + ri * cellSize}
                      width={cellSize - 1} height={cellSize - 1}
                      fill={corrToColor(val)} rx={2}
                      opacity={isHov ? 1 : 0.88}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered({ r: ri, c: ci, row, col, val })}
                      onMouseLeave={() => setHovered(null)}
                    />
                    {cellSize >= 34 && (
                      <text
                        x={labelW + ci * cellSize + cellSize / 2}
                        y={34 + ri * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        fill={Math.abs(val) > 0.45 ? 'rgba(255,255,255,0.9)' : '#6b7280'}
                        fontSize={8} fontWeight={500}
                        style={{ pointerEvents: 'none' }}
                      >
                        {val.toFixed(2)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div style={{
            position: 'absolute', top: 8, right: 0,
            background: '#0d1426', border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 11, color: 'var(--text-primary)',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
          }}>
            <span style={{ color: '#2dd4bf' }}>{hovered.row}</span>
            {' × '}
            <span style={{ color: '#2dd4bf' }}>{hovered.col}</span>
            <br />
            r = <strong>{hovered.val?.toFixed(4)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
