export default function Sparkline({ data, width = 80, height = 32 }) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-card-bg rounded animate-pulse" />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - padding * 2) - padding
    return `${x},${y}`
  }).join(' ')

  const trending = data[data.length - 1] >= data[0]
  const color = trending ? '#4ade80' : '#f87171'

  // Build gradient fill area
  const firstPoint = `0,${height}`
  const lastPoint = `${width},${height}`
  const areaPoints = `${firstPoint} ${points} ${lastPoint}`

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={`grad-${trending ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#grad-${trending ? 'up' : 'down'})`}
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
