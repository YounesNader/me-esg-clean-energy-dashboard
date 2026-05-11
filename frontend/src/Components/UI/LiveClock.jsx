import { useEffect, useState } from 'react'

export default function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n) => String(n).padStart(2, '0')
  const hh = pad(time.getHours())
  const mm = pad(time.getMinutes())
  const ss = pad(time.getSeconds())
  const date = time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="text-center">
      <div
        style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--teal)',
          letterSpacing: '0.06em',
          lineHeight: 1.2,
        }}
      >
        {hh}:{mm}:{ss}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.08em' }}>
        {date}
      </div>
    </div>
  )
}
