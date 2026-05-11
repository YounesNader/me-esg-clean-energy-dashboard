import { memo, useState } from 'react'

const COUNTRY_COLORS = {
  'Saudi Arabia': '#00d4aa',
  UAE:            '#3b82f6',
  Qatar:          '#10b981',
  Kuwait:         '#a78bfa',
  Oman:           '#fb923c',
  Egypt:          '#fbbf24',
  Bahrain:        '#f472b6',
  Jordan:         '#86efac',
}

const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}

// Simplified SVG paths in a 800×520 viewBox
// Equirectangular: x = (lon-24)/36*800, y = (32-lat)/18*520
const PATHS = {
  Egypt: 'M 0,0 L 200,0 L 200,80 L 222,80 L 222,130 L 240,150 L 195,200 L 180,230 L 165,260 L 155,250 L 150,200 L 120,200 L 100,200 L 80,200 L 60,185 L 30,185 L 0,185 Z',
  Jordan: 'M 240,50 L 280,50 L 290,60 L 310,65 L 315,100 L 300,120 L 280,130 L 260,140 L 240,135 L 222,130 L 222,80 L 240,80 Z',
  'Saudi Arabia': 'M 310,65 L 320,55 L 355,45 L 370,55 L 395,50 L 430,60 L 475,65 L 530,80 L 560,95 L 590,100 L 620,115 L 640,140 L 650,165 L 660,200 L 660,240 L 645,270 L 620,295 L 600,310 L 580,330 L 550,350 L 520,360 L 490,365 L 460,360 L 430,350 L 390,320 L 350,300 L 320,275 L 295,250 L 270,220 L 260,190 L 255,165 L 260,140 L 280,130 L 300,120 L 315,100 Z',
  Kuwait: 'M 530,80 L 555,72 L 570,78 L 560,95 L 530,80 Z',
  Bahrain: 'M 605,155 L 610,152 L 615,156 L 612,162 L 606,162 Z',
  Qatar: 'M 618,140 L 628,135 L 638,140 L 640,155 L 636,168 L 625,168 L 618,158 Z',
  UAE: 'M 640,140 L 660,130 L 690,135 L 720,130 L 740,140 L 750,155 L 740,170 L 720,175 L 700,178 L 680,180 L 660,175 L 650,165 L 640,140 Z',
  Oman: 'M 720,130 L 745,110 L 760,100 L 780,105 L 800,120 L 800,200 L 790,240 L 780,270 L 760,300 L 740,320 L 720,330 L 700,310 L 690,280 L 700,250 L 710,220 L 715,190 L 720,170 L 720,150 L 720,130 Z',
}

// Label positions
const LABELS = {
  Egypt:         { x: 100,  y: 105, anchor: 'middle' },
  Jordan:        { x: 270,  y: 97,  anchor: 'middle' },
  'Saudi Arabia':{ x: 470,  y: 210, anchor: 'middle' },
  Kuwait:        { x: 549,  y: 76,  anchor: 'middle' },
  Bahrain:       { x: 625,  y: 150, anchor: 'middle' },
  Qatar:         { x: 630,  y: 148, anchor: 'middle' },
  UAE:           { x: 696,  y: 153, anchor: 'middle' },
  Oman:          { x: 755,  y: 210, anchor: 'middle' },
}

// Country budget normalization for opacity
function opacityFromBudget(budget, max) {
  return 0.35 + (budget / max) * 0.55
}

const MEMap = memo(function MEMap({ summaries = [], onCountryClick }) {
  const [hovered, setHovered] = useState(null)

  const budgetMap = Object.fromEntries((summaries || []).map((s) => [s.country, s.total_esg_budget_usd_million]))
  const maxBudget = Math.max(...Object.values(budgetMap), 1)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox="0 0 800 380"
        style={{ width: '100%', height: 'auto', maxHeight: 360 }}
      >
        {/* Ocean background */}
        <rect width="800" height="380" fill="rgba(10,10,15,0)" />

        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 95} x2="800" y2={i * 95}
            stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`v${i}`} x1={i * 200} y1="0" x2={i * 200} y2="380"
            stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}

        {Object.entries(PATHS).map(([country, path]) => {
          const color = COUNTRY_COLORS[country] || '#00d4aa'
          const budget = budgetMap[country] || 0
          const opacity = opacityFromBudget(budget, maxBudget)
          const isHovered = hovered === country
          const hasData = budget > 0

          return (
            <g
              key={country}
              style={{ cursor: onCountryClick ? 'pointer' : 'default' }}
              onClick={() => onCountryClick?.(country)}
              onMouseEnter={() => setHovered(country)}
              onMouseLeave={() => setHovered(null)}
            >
              <path
                d={path}
                fill={color}
                fillOpacity={isHovered ? Math.min(1, opacity + 0.25) : opacity}
                stroke={isHovered ? color : 'rgba(255,255,255,0.15)'}
                strokeWidth={isHovered ? 1.5 : 0.8}
                style={{ transition: 'fill-opacity 0.2s, stroke 0.2s' }}
              />
            </g>
          )
        })}

        {/* Country labels */}
        {Object.entries(LABELS).map(([country, pos]) => {
          if (['Bahrain', 'Kuwait'].includes(country)) return null // too small for labels
          const isHovered = hovered === country
          return (
            <text
              key={country}
              x={pos.x} y={pos.y}
              textAnchor={pos.anchor}
              style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: country === 'Saudi Arabia' ? 11 : 9,
                fontWeight: 600,
                fill: isHovered ? '#fff' : 'rgba(255,255,255,0.65)',
                pointerEvents: 'none',
                transition: 'fill 0.2s',
              }}
            >
              {country === 'Saudi Arabia' ? 'Saudi Arabia' : country}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hovered && budgetMap[hovered] && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          background: '#16161f',
          border: `1px solid ${COUNTRY_COLORS[hovered]}40`,
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          minWidth: 140,
        }}>
          <div style={{ fontSize: 13, marginBottom: 2 }}>
            {FLAGS[hovered]} <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 12 }}>{hovered}</span>
          </div>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            color: COUNTRY_COLORS[hovered],
            fontWeight: 600,
          }}>
            ${(budgetMap[hovered] / 1000).toFixed(2)}B total
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 8,
        justifyContent: 'center',
      }}>
        {Object.entries(COUNTRY_COLORS).map(([c, col]) => (
          <div
            key={c}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 9,
              color: 'var(--text-muted)',
              cursor: onCountryClick ? 'pointer' : 'default',
            }}
            onClick={() => onCountryClick?.(c)}
          >
            <div style={{ width: 8, height: 8, borderRadius: 2, background: col, opacity: 0.8 }} />
            {c}
          </div>
        ))}
      </div>
    </div>
  )
})

export default MEMap
