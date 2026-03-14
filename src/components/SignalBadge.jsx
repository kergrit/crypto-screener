export default function SignalBadge({ signal, color, onClick }) {
  const bgMap = {
    'text-emerald-400': 'bg-emerald-400/15 border-emerald-400/30',
    'text-green-400': 'bg-green-400/15 border-green-400/30',
    'text-red-400': 'bg-red-400/15 border-red-400/30',
    'text-orange-400': 'bg-orange-400/15 border-orange-400/30',
    'text-gray-400': 'bg-gray-400/10 border-gray-400/20',
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color} ${bgMap[color] || ''} ${onClick ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : ''}`}
    >
      {signal}
    </span>
  )
}
