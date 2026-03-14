// Backtesting engine — simulates trades using historical kline data
// Walks through candles, applies strategy logic, tracks P&L

import { scalping, swing, trendFollowing } from './strategies'

/**
 * Run a backtest for a given strategy on historical klines
 * @param {Array} klines - Full historical kline data (OHLCV)
 * @param {string} strategyName - 'scalping' | 'swing' | 'trend'
 * @param {Object} options - { initialCapital, positionSizePct, maxOpenTrades }
 * @returns {Object} - { trades, stats, equity }
 */
export function runBacktest(klines, strategyName, options = {}) {
  const {
    initialCapital = 10000,
    positionSizePct = 10, // % of capital per trade
    maxOpenTrades = 3,
  } = options

  const strategyFn = {
    scalping: scalping,
    swing: swing,
    trend: trendFollowing,
  }[strategyName]

  if (!strategyFn || klines.length < 60) {
    return { trades: [], stats: emptyStats(), equity: [] }
  }

  // Minimum lookback for indicators
  const minCandles = strategyName === 'scalping' ? 30 : strategyName === 'swing' ? 50 : 60

  const trades = []
  let openTrades = []
  let capital = initialCapital
  const equity = [{ time: klines[minCandles]?.openTime, value: capital }]

  // Walk forward through candles
  for (let i = minCandles; i < klines.length; i++) {
    const candle = klines[i]
    const windowKlines = klines.slice(0, i + 1)

    // Check open trades for TP/SL hits
    openTrades = openTrades.filter(trade => {
      const isLong = trade.action === 'BUY'

      // Check stop loss
      const slHit = isLong
        ? candle.low <= trade.stopLoss
        : candle.high >= trade.stopLoss

      // Check take profit
      const tpHit = isLong
        ? candle.high >= trade.takeProfit
        : candle.low <= trade.takeProfit

      if (slHit) {
        const pnl = isLong
          ? (trade.stopLoss - trade.entry) * trade.qty
          : (trade.entry - trade.stopLoss) * trade.qty
        trade.exitPrice = trade.stopLoss
        trade.exitTime = candle.openTime
        trade.pnl = pnl
        trade.pnlPct = (pnl / trade.cost) * 100
        trade.result = 'LOSS'
        trade.exitReason = 'Stop Loss'
        capital += trade.cost + pnl
        trades.push({ ...trade })
        return false
      }

      if (tpHit) {
        const pnl = isLong
          ? (trade.takeProfit - trade.entry) * trade.qty
          : (trade.entry - trade.takeProfit) * trade.qty
        trade.exitPrice = trade.takeProfit
        trade.exitTime = candle.openTime
        trade.pnl = pnl
        trade.pnlPct = (pnl / trade.cost) * 100
        trade.result = 'WIN'
        trade.exitReason = 'Take Profit'
        capital += trade.cost + pnl
        trades.push({ ...trade })
        return false
      }

      return true // Still open
    })

    // Check for new entry signal (only if we have room for more trades)
    if (openTrades.length < maxOpenTrades) {
      const signal = strategyFn(windowKlines)

      if (signal && (signal.action === 'BUY' || signal.action === 'SELL') && signal.confidence >= 0.5) {
        const positionSize = capital * (positionSizePct / 100)
        if (positionSize > 10) { // Min $10 position
          const qty = positionSize / signal.entry

          openTrades.push({
            action: signal.action,
            entry: signal.entry,
            entryTime: candle.openTime,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            qty,
            cost: positionSize,
            confidence: signal.confidence,
            reason: signal.reason,
          })

          capital -= positionSize
        }
      }
    }

    // Track equity
    const openValue = openTrades.reduce((sum, t) => {
      const currentPrice = candle.close
      const isLong = t.action === 'BUY'
      const unrealized = isLong
        ? (currentPrice - t.entry) * t.qty
        : (t.entry - currentPrice) * t.qty
      return sum + t.cost + unrealized
    }, 0)

    equity.push({
      time: candle.openTime,
      value: capital + openValue,
    })
  }

  // Close remaining open trades at last price
  const lastPrice = klines[klines.length - 1].close
  openTrades.forEach(trade => {
    const isLong = trade.action === 'BUY'
    const pnl = isLong
      ? (lastPrice - trade.entry) * trade.qty
      : (trade.entry - lastPrice) * trade.qty
    trade.exitPrice = lastPrice
    trade.exitTime = klines[klines.length - 1].openTime
    trade.pnl = pnl
    trade.pnlPct = (pnl / trade.cost) * 100
    trade.result = pnl >= 0 ? 'WIN' : 'LOSS'
    trade.exitReason = 'End of Period'
    capital += trade.cost + pnl
    trades.push({ ...trade })
  })

  return {
    trades,
    stats: calcStats(trades, initialCapital, equity),
    equity,
  }
}

function emptyStats() {
  return {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalPnl: 0,
    totalPnlPct: 0,
    avgPnlPct: 0,
    maxWin: 0,
    maxLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    sharpe: 0,
    finalCapital: 0,
  }
}

function calcStats(trades, initialCapital, equity) {
  if (trades.length === 0) return { ...emptyStats(), finalCapital: initialCapital }

  const wins = trades.filter(t => t.result === 'WIN')
  const losses = trades.filter(t => t.result === 'LOSS')
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const finalCapital = initialCapital + totalPnl

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))

  // Max drawdown
  let peak = equity[0]?.value || initialCapital
  let maxDD = 0
  let maxDDPct = 0
  for (const point of equity) {
    if (point.value > peak) peak = point.value
    const dd = peak - point.value
    const ddPct = (dd / peak) * 100
    if (dd > maxDD) maxDD = dd
    if (ddPct > maxDDPct) maxDDPct = ddPct
  }

  // Simple Sharpe approximation (daily returns)
  const returns = []
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1].value > 0) {
      returns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value)
    }
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
    : 0
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / trades.length) * 100,
    totalPnl,
    totalPnlPct: (totalPnl / initialCapital) * 100,
    avgPnlPct: trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length,
    maxWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
    maxLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
    avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown: maxDD,
    maxDrawdownPct: maxDDPct,
    sharpe,
    finalCapital,
  }
}

/**
 * Run backtest for all 3 strategies and compare
 */
export function compareStrategies(klines, options = {}) {
  return {
    scalping: runBacktest(klines, 'scalping', options),
    swing: runBacktest(klines, 'swing', options),
    trend: runBacktest(klines, 'trend', options),
  }
}
