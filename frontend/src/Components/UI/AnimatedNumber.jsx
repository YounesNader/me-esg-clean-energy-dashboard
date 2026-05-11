import { useEffect, useRef, useState } from 'react'

export default function AnimatedNumber({ value, duration = 900, className = '', style = {} }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    const numTarget = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(numTarget * eased)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  const orig = String(value)
  const fmt = () => {
    if (orig.includes('B')) return `${display.toFixed(1)}B`
    if (orig.includes('M')) return `${Math.round(display).toLocaleString()}M`
    if (orig.includes('%')) return `${display.toFixed(1)}%`
    const target = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
    if (Number.isInteger(target)) return Math.round(display).toLocaleString()
    return display.toFixed(1)
  }

  const prefix = orig.match(/^\$/) ? '$' : ''

  return (
    <span className={className} style={{ fontFamily: '"Bebas Neue", sans-serif', ...style }}>
      {prefix}{fmt()}
    </span>
  )
}
