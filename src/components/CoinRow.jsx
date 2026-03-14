import { useState, useEffect, useRef } from 'react'
import SignalBadge from './SignalBadge'
import Sparkline from './Sparkline'

function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toPrecision(4)
}

function formatVolume(vol) {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K'
  return vol.toFixed(2)
}

function RSIBar({ value }) {
  if (value === null || value === undefined) return <span className="text-t-muted">--</span>

  let color = 'bg-gray-500'
  let textColor = 'text-gray-300'
  if (value < 30) { color = 'bg-green-500'; textColor = 'text-green-400' }
  else if (value > 70) { color = 'bg-red-500'; textColor = 'text-red-400' }
  else if (value < 45) { color = 'bg-green-700'; textColor = 'text-green-300' }
  else if (value > 55) { color = 'bg-red-700'; textColor = 'text-orange-300' }

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <span className={`text-sm font-mono ${textColor} w-8 text-right`}>{value.toFixed(0)}</span>
      <div className="flex-1 h-1.5 bg-card-bg rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

function MACDBadge({ macd }) {
  if (!macd) return <span className="text-t-muted">--</span>
  const bullish = macd.bullish
  return (
    <span className={`text-xs font-medium ${bullish ? 'text-green-400' : 'text-red-400'}`}>
      {bullish ? 'BULL' : 'BEAR'}
      {macd.crossUp && ' ↑'}
      {macd.crossDown && ' ↓'}
    </span>
  )
}

function EMABadge({ emaCross }) {
  if (!emaCross) return <span className="text-t-muted">--</span>
  return (
    <span className={`text-xs font-medium ${emaCross.bullish ? 'text-green-400' : 'text-red-400'}`}>
      {emaCross.bullish ? '9>21' : '9<21'}
      {emaCross.crossUp && ' ↑'}
      {emaCross.crossDown && ' ↓'}
    </span>
  )
}

export default function CoinRow({ coin, isPinned, onTogglePin, onSelect, isSelected, onSignalClick }) {
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(coin.price)

  useEffect(() => {
    if (coin.prevPrice && coin.price !== coin.prevPrice) {
      setFlashClass(coin.price > coin.prevPrice ? 'flash-up' : 'flash-down')
      const timer = setTimeout(() => setFlashClass(''), 500)
      prevPriceRef.current = coin.price
      return () => clearTimeout(timer)
    }
  }, [coin.price, coin.prevPrice])

  const ind = coin.indicators

  return (
    <tr
      className={`border-b border-row-border hover:bg-row-hover cursor-pointer transition-colors ${flashClass} ${isSelected ? 'bg-row-hover' : ''}`}
      onClick={() => onSelect(coin.symbol)}
    >
      {/* Pin */}
      <td className="px-3 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(coin.symbol) }}
          className={`text-lg ${isPinned ? 'text-yellow-400' : 'text-t-muted hover:text-t-secondary'}`}
        >
          ★
        </button>
      </td>

      {/* Coin name */}
      <td className="px-3 py-3">
        <span className="font-semibold text-t-primary">{coin.displayName}</span>
        <span className="text-t-muted text-xs ml-1">/USDT</span>
      </td>

      {/* Price */}
      <td className="px-3 py-3 text-right font-mono text-sm">
        ${formatPrice(coin.price)}
      </td>

      {/* 24h Change */}
      <td className={`px-3 py-3 text-right font-mono text-sm ${coin.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h?.toFixed(2)}%
      </td>

      {/* Sparkline */}
      <td className="px-3 py-3">
        <Sparkline data={coin.sparklineData} />
      </td>

      {/* Volume */}
      <td className="px-3 py-3 text-right font-mono text-sm text-t-secondary">
        ${formatVolume(coin.volume24h)}
      </td>

      {/* RSI */}
      <td className="px-3 py-3">
        <RSIBar value={ind?.rsi} />
      </td>

      {/* EMA */}
      <td className="px-3 py-3 text-center">
        <EMABadge emaCross={ind?.emaCross} />
      </td>

      {/* MACD */}
      <td className="px-3 py-3 text-center">
        <MACDBadge macd={ind?.macd} />
      </td>

      {/* Signal — clickable */}
      <td className="px-3 py-3 text-center">
        {ind ? (
          <SignalBadge
            signal={ind.signal}
            color={ind.color}
            onClick={(e) => {
              e.stopPropagation()
              onSignalClick?.(ind.signal)
            }}
          />
        ) : (
          <span className="text-t-muted">Loading...</span>
        )}
      </td>
    </tr>
  )
}
