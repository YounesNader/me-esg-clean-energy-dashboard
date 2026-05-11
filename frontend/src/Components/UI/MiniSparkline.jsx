import { memo } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

const MiniSparkline = memo(function MiniSparkline({ data = [], color = '#00d4aa', height = 28 }) {
  if (!data?.length) return <div style={{ height }} />

  const pts = data.slice(-7).map((v, i) => ({ i, v: typeof v === 'object' ? v.value : v }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{
                background: '#16161f',
                border: '1px solid rgba(0,212,170,0.25)',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 10,
                fontFamily: '"IBM Plex Mono", monospace',
                color: '#f1f5f9',
              }}>
                {(payload[0].value || 0).toLocaleString()}
              </div>
            )
          }}
        />
        <Line
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          dot={false} activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export default MiniSparkline
