import { useState, useEffect } from 'react'
import { fetchKlines } from '../lib/binance'
import { analyzeAllStrategies } from '../lib/strategies'

function formatPrice(price) {
  if (!price) return '--'
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toPrecision(4)
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  let color = 'bg-gray-500'
  if (pct >= 70) color = 'bg-emerald-500'
  else if (pct >= 50) color = 'bg-green-500'
  else if (pct >= 30) color = 'bg-yellow-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-card-bg rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-t-secondary w-8">{pct}%</span>
    </div>
  )
}

function StrategyCard({ result, isActive, onClick }) {
  if (!result) return null

  const isBuy = result.action === 'BUY'
  const isSell = result.action === 'SELL'
  const isWait = result.action === 'WAIT'

  const actionColors = {
    BUY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    SELL: 'text-red-400 border-red-500/30 bg-red-500/5',
    WAIT: 'text-t-secondary border-glass-border bg-card-bg',
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all ${actionColors[result.action]} ${isActive ? 'ring-2 ring-blue-500/50 scale-[1.02]' : 'hover:scale-[1.01]'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold uppercase tracking-wider">{result.strategy}</span>
        <span className={`text-lg font-bold ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-t-muted'}`}>
          {result.action}
        </span>
      </div>

      {!isWait ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div>
              <div className="text-[10px] text-t-muted uppercase">Entry</div>
              <div className="text-sm font-mono text-t-primary">${formatPrice(result.entry)}</div>
            </div>
            <div>
              <div className="text-[10px] text-green-500 uppercase">Take Profit</div>
              <div className="text-sm font-mono text-green-400">${formatPrice(result.takeProfit)}</div>
            </div>
            <div>
              <div className="text-[10px] text-red-500 uppercase">Stop Loss</div>
              <div className="text-sm font-mono text-red-400">${formatPrice(result.stopLoss)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-t-muted">R:R Ratio</span>
            <span className={`text-sm font-bold font-mono ${result.riskReward >= 2 ? 'text-emerald-400' : result.riskReward >= 1.5 ? 'text-green-400' : 'text-yellow-400'}`}>
              1:{result.riskReward?.toFixed(1)}
            </span>
          </div>

          <div className="mb-2">
            <div className="text-[10px] text-t-muted uppercase mb-1">Confidence</div>
            <ConfidenceBar value={result.confidence} />
          </div>
        </>
      ) : null}

      <div className="text-[11px] text-t-secondary mt-2 leading-relaxed">{result.reason}</div>
    </div>
  )
}

export default function StrategyPanel({ coin, timeframe, market = 'futures' }) {
  const [strategies, setStrategies] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeStrategy, setActiveStrategy] = useState('swing')

  useEffect(() => {
    if (!coin?.symbol) return

    let cancelled = false
    setLoading(true)

    fetchKlines(coin.symbol, timeframe, 100, market).then(klines => {
      if (cancelled) return
      const results = analyzeAllStrategies(klines)
      setStrategies(results)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [coin?.symbol, timeframe, market])

  if (!coin) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-t-primary">📊 Position Recommendations</h3>
        <span className="text-[10px] text-t-muted uppercase">Based on {timeframe} candles</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-t-muted text-sm">Analyzing strategies...</span>
        </div>
      ) : strategies ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StrategyCard
            result={strategies.scalping}
            isActive={activeStrategy === 'scalping'}
            onClick={() => setActiveStrategy('scalping')}
          />
          <StrategyCard
            result={strategies.swing}
            isActive={activeStrategy === 'swing'}
            onClick={() => setActiveStrategy('swing')}
          />
          <StrategyCard
            result={strategies.trend}
            isActive={activeStrategy === 'trend'}
            onClick={() => setActiveStrategy('trend')}
          />
        </div>
      ) : (
        <div className="text-t-muted text-center py-8">Not enough data for analysis</div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 text-[10px] text-t-muted text-center">
        ⚠️ For educational purposes only. Not financial advice. Always do your own research before trading.
      </div>
    </div>
  )
}
