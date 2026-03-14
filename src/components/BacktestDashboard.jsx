import { useState, useEffect } from 'react'
import { fetchKlines } from '../lib/binance'
import { compareStrategies } from '../lib/backtest'

function formatMoney(val) {
  if (val === null || val === undefined) return '--'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatBox({ label, value, color, sub }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-t-muted uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold font-mono ${color || 'text-t-primary'}`}>{value}</div>
      {sub && <div className="text-[10px] text-t-muted">{sub}</div>}
    </div>
  )
}

function EquityChart({ equity, height = 80 }) {
  if (!equity || equity.length < 2) return null

  const values = equity.map(e => e.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 300

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')

  const trending = values[values.length - 1] >= values[0]
  const color = trending ? '#4ade80' : '#f87171'

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#eqGrad)" points={`0,${height} ${points} ${width},${height}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
      {/* Start line */}
      <line x1="0" y1={height - ((values[0] - min) / range) * (height - 8) - 4} x2={width} y2={height - ((values[0] - min) / range) * (height - 8) - 4} stroke="#666" strokeWidth="0.5" strokeDasharray="4,4" />
    </svg>
  )
}

function StrategyResult({ name, data, isWinner }) {
  const s = data.stats

  return (
    <div className={`glass-panel rounded-xl border p-4 ${isWinner ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-card-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-t-primary text-sm uppercase">{name}</span>
          {isWinner && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">BEST</span>}
        </div>
        <span className={`text-lg font-bold font-mono ${s.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {s.totalPnlPct >= 0 ? '+' : ''}{s.totalPnlPct.toFixed(1)}%
        </span>
      </div>

      {/* Equity chart */}
      <div className="mb-3">
        <EquityChart equity={data.equity} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatBox label="Trades" value={s.totalTrades} />
        <StatBox
          label="Win Rate"
          value={`${s.winRate.toFixed(0)}%`}
          color={s.winRate >= 50 ? 'text-green-400' : 'text-red-400'}
        />
        <StatBox
          label="Profit Factor"
          value={s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(1)}
          color={s.profitFactor >= 1.5 ? 'text-green-400' : s.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatBox label="Total P&L" value={formatMoney(s.totalPnl)} color={s.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatBox label="Max DD" value={`-${s.maxDrawdownPct.toFixed(1)}%`} color="text-orange-400" />
        <StatBox label="Sharpe" value={s.sharpe.toFixed(2)} color={s.sharpe >= 1 ? 'text-green-400' : 'text-gray-400'} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Avg Win" value={formatMoney(s.avgWin)} color="text-green-400" />
        <StatBox label="Avg Loss" value={formatMoney(s.avgLoss)} color="text-red-400" />
      </div>

      {/* Trade list (last 5) */}
      {data.trades.length > 0 && (
        <div className="mt-3 border-t border-row-border pt-3">
          <div className="text-[10px] text-t-muted uppercase mb-2">Recent Trades</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.trades.slice(-5).reverse().map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className={t.action === 'BUY' ? 'text-green-400' : 'text-red-400'}>{t.action}</span>
                <span className="text-t-muted font-mono">${formatPrice(t.entry)} → ${formatPrice(t.exitPrice)}</span>
                <span className={t.result === 'WIN' ? 'text-green-400' : 'text-red-400'}>
                  {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
                </span>
                <span className="text-t-muted text-[10px]">{t.exitReason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatPrice(price) {
  if (!price) return '--'
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return price.toFixed(2)
  return price.toPrecision(4)
}

const PERIODS = [
  { label: '1 Week', klines: 168, interval: '1h' },   // 7d * 24h
  { label: '1 Month', klines: 720, interval: '1h' },   // 30d * 24h
  { label: '3 Months', klines: 500, interval: '4h' },   // ~90d at 4h
  { label: '6 Months', klines: 500, interval: '8h' },   // ~166d at 8h
]

export default function BacktestDashboard({ coin, onClose, market = 'futures' }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState(0) // default 1 Week — suited for Futures trading

  useEffect(() => {
    if (!coin?.symbol) return

    let cancelled = false
    setLoading(true)

    const p = PERIODS[period]
    fetchKlines(coin.symbol, p.interval, Math.min(p.klines, 1000), market).then(klines => {
      if (cancelled) return
      const compared = compareStrategies(klines, { initialCapital: 10000, positionSizePct: 10 })
      setResults(compared)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [coin?.symbol, period, market])

  if (!coin) return null

  // Find the best strategy
  const findBest = () => {
    if (!results) return null
    const entries = Object.entries(results)
    let best = entries[0]
    for (const entry of entries) {
      if (entry[1].stats.totalPnlPct > best[1].stats.totalPnlPct) best = entry
    }
    return best[0]
  }

  const bestStrategy = findBest()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-t-primary">
          🧪 Backtest Simulation
        </h3>
        <div className="flex gap-1 bg-glass-bg rounded-lg p-1">
          {PERIODS.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => setPeriod(idx)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === idx
                  ? 'bg-blue-500 text-white'
                  : 'text-t-secondary hover:text-t-primary hover:bg-card-hover'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Backtest config info */}
      <div className="flex gap-4 mb-4 text-[11px] text-t-muted">
        <span>💰 Initial: $10,000</span>
        <span>📊 Position Size: 10%</span>
        <span>📈 Max Open: 3 trades</span>
        <span>📉 Using {PERIODS[period].interval} candles × {PERIODS[period].klines}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-t-muted">Running backtest simulation...</span>
        </div>
      ) : results ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StrategyResult name="Scalping" data={results.scalping} isWinner={bestStrategy === 'scalping'} />
          <StrategyResult name="Swing" data={results.swing} isWinner={bestStrategy === 'swing'} />
          <StrategyResult name="Trend" data={results.trend} isWinner={bestStrategy === 'trend'} />
        </div>
      ) : (
        <div className="text-t-muted text-center py-8">Not enough historical data</div>
      )}

      {/* Summary */}
      {results && bestStrategy && (
        <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center">
          <span className="text-sm text-t-secondary">Best performing strategy for {PERIODS[period].label}: </span>
          <span className="text-sm font-bold text-emerald-400 uppercase">{bestStrategy}</span>
          <span className="text-sm text-t-secondary"> with </span>
          <span className={`text-sm font-bold font-mono ${results[bestStrategy].stats.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {results[bestStrategy].stats.totalPnlPct >= 0 ? '+' : ''}{results[bestStrategy].stats.totalPnlPct.toFixed(1)}% return
          </span>
        </div>
      )}

      <div className="mt-3 text-[10px] text-t-muted text-center">
        ⚠️ Past performance does not guarantee future results. Backtests use simplified assumptions (no slippage, no fees).
      </div>
    </div>
  )
}
