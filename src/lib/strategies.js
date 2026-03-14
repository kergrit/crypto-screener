// Trading strategies: Scalping, Swing, Trend Following
// Each returns: { action, entry, takeProfit, stopLoss, riskReward, confidence, reason }

import { calcRSI, calcEMA, calcMACD, calcBollingerBands, calcVolumeChange } from './indicators'

// --- ATR (Average True Range) for dynamic SL/TP ---
export function calcATR(klines, period = 14) {
  if (klines.length < period + 1) return null
  const trs = []
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high
    const low = klines[i].low
    const prevClose = klines[i - 1].close
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
  }
  // Wilder's smoothed ATR
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
  }
  return atr
}

// --- Support/Resistance from recent pivots ---
function findSupportResistance(klines, lookback = 20) {
  const recent = klines.slice(-lookback)
  const lows = recent.map(k => k.low)
  const highs = recent.map(k => k.high)

  const support = Math.min(...lows)
  const resistance = Math.max(...highs)
  const pivotPoint = (support + resistance + recent[recent.length - 1].close) / 3

  return { support, resistance, pivotPoint }
}

// ============================================================
// STRATEGY 1: SCALPING
// Short-term, fast entries/exits, uses RSI + BB + Volume
// ============================================================
export function scalping(klines) {
  if (klines.length < 30) return null

  const closes = klines.map(k => k.close)
  const volumes = klines.map(k => k.volume)
  const price = closes[closes.length - 1]
  const atr = calcATR(klines, 14)

  const rsi = calcRSI(closes, 7) // Faster RSI for scalping
  const bb = calcBollingerBands(closes, 20, 2)
  const volChange = calcVolumeChange(volumes)

  if (!atr || rsi === null || !bb) return null

  const slMultiplier = 1.0 // Tight SL
  const tpMultiplier = 1.5 // Quick TP

  let action = 'WAIT'
  let entry = price
  let stopLoss, takeProfit, confidence, reason

  // Oversold + near lower BB + volume spike → BUY
  if (rsi < 30 && bb.percentB < 0.2) {
    action = 'BUY'
    stopLoss = price - atr * slMultiplier
    takeProfit = price + atr * tpMultiplier
    confidence = 0.7
    reason = 'RSI oversold + price near lower Bollinger Band'
    if (volChange > 30) { confidence += 0.1; reason += ' + volume spike' }
  }
  // Overbought + near upper BB → SELL
  else if (rsi > 70 && bb.percentB > 0.8) {
    action = 'SELL'
    stopLoss = price + atr * slMultiplier
    takeProfit = price - atr * tpMultiplier
    confidence = 0.7
    reason = 'RSI overbought + price near upper Bollinger Band'
    if (volChange > 30) { confidence += 0.1; reason += ' + volume spike' }
  }
  // Mild signals
  else if (rsi < 40 && bb.percentB < 0.35) {
    action = 'BUY'
    stopLoss = price - atr * slMultiplier
    takeProfit = price + atr * tpMultiplier
    confidence = 0.5
    reason = 'RSI leaning oversold + price below mid BB'
  }
  else if (rsi > 60 && bb.percentB > 0.65) {
    action = 'SELL'
    stopLoss = price + atr * slMultiplier
    takeProfit = price - atr * tpMultiplier
    confidence = 0.5
    reason = 'RSI leaning overbought + price above mid BB'
  }
  else {
    return {
      strategy: 'Scalping',
      action: 'WAIT',
      entry: price,
      stopLoss: null,
      takeProfit: null,
      riskReward: null,
      confidence: 0,
      reason: 'No clear scalping setup — conditions not met',
      params: { rsi, bb: bb.percentB, volChange, atr },
    }
  }

  const risk = Math.abs(price - stopLoss)
  const reward = Math.abs(takeProfit - price)
  const riskReward = risk > 0 ? reward / risk : 0

  return {
    strategy: 'Scalping',
    action,
    entry: price,
    stopLoss,
    takeProfit,
    riskReward,
    confidence: Math.min(1, confidence),
    reason,
    params: { rsi, bb: bb.percentB, volChange, atr },
  }
}

// ============================================================
// STRATEGY 2: SWING TRADING
// Medium-term, uses EMA cross + MACD + Support/Resistance
// ============================================================
export function swing(klines) {
  if (klines.length < 50) return null

  const closes = klines.map(k => k.close)
  const volumes = klines.map(k => k.volume)
  const price = closes[closes.length - 1]
  const atr = calcATR(klines, 14)

  const rsi = calcRSI(closes, 14)
  const macd = calcMACD(closes)
  const ema9 = calcEMA(closes, 9)
  const ema21 = calcEMA(closes, 21)
  const { support, resistance } = findSupportResistance(klines, 30)
  const volChange = calcVolumeChange(volumes)

  if (!atr || !macd || ema9.length < 2 || ema21.length < 2) return null

  const currEma9 = ema9[ema9.length - 1]
  const currEma21 = ema21[ema21.length - 1]
  const prevEma9 = ema9[ema9.length - 2]
  const offset = ema9.length - ema21.length
  const prevEma21 = ema21[ema21.length - 2]

  const slMultiplier = 2.0
  const tpMultiplier = 3.0

  let action = 'WAIT'
  let entry = price
  let stopLoss, takeProfit, confidence = 0, reason = ''

  let bullScore = 0
  let bearScore = 0

  // EMA golden cross
  if (prevEma9 <= prevEma21 && currEma9 > currEma21) { bullScore += 2; reason += 'EMA golden cross + ' }
  else if (prevEma9 >= prevEma21 && currEma9 < currEma21) { bearScore += 2; reason += 'EMA death cross + ' }
  else if (currEma9 > currEma21) { bullScore += 1; reason += 'EMA bullish trend + ' }
  else { bearScore += 1; reason += 'EMA bearish trend + ' }

  // MACD confirmation
  if (macd.crossUp) { bullScore += 2; reason += 'MACD bullish cross + ' }
  else if (macd.crossDown) { bearScore += 2; reason += 'MACD bearish cross + ' }
  else if (macd.bullish) { bullScore += 1; reason += 'MACD bullish + ' }
  else { bearScore += 1; reason += 'MACD bearish + ' }

  // RSI confirmation
  if (rsi < 40) { bullScore += 1; reason += 'RSI oversold zone + ' }
  else if (rsi > 60) { bearScore += 1; reason += 'RSI overbought zone + ' }

  // Volume confirmation
  if (volChange > 30) { reason += 'High volume confirms + ' }

  reason = reason.replace(/ \+ $/, '')

  if (bullScore >= 3) {
    action = 'BUY'
    stopLoss = Math.max(support, price - atr * slMultiplier)
    takeProfit = Math.min(resistance, price + atr * tpMultiplier)
    if (takeProfit <= price) takeProfit = price + atr * tpMultiplier
    confidence = Math.min(1, 0.4 + bullScore * 0.1)
  }
  else if (bearScore >= 3) {
    action = 'SELL'
    stopLoss = Math.min(resistance, price + atr * slMultiplier)
    takeProfit = Math.max(support, price - atr * tpMultiplier)
    if (takeProfit >= price) takeProfit = price - atr * tpMultiplier
    confidence = Math.min(1, 0.4 + bearScore * 0.1)
  }
  else {
    return {
      strategy: 'Swing',
      action: 'WAIT',
      entry: price,
      stopLoss: null,
      takeProfit: null,
      riskReward: null,
      confidence: 0,
      reason: 'No clear swing setup — mixed signals',
      params: { rsi, macd: macd.bullish, ema: currEma9 > currEma21, support, resistance, atr },
    }
  }

  const risk = Math.abs(price - stopLoss)
  const reward = Math.abs(takeProfit - price)
  const riskReward = risk > 0 ? reward / risk : 0

  return {
    strategy: 'Swing',
    action,
    entry: price,
    stopLoss,
    takeProfit,
    riskReward,
    confidence,
    reason,
    params: { rsi, macd: macd.bullish, ema: currEma9 > currEma21, support, resistance, atr },
  }
}

// ============================================================
// STRATEGY 3: TREND FOLLOWING
// Long-term, uses EMA 50/200 + MACD + Volume trend
// ============================================================
export function trendFollowing(klines) {
  if (klines.length < 60) return null

  const closes = klines.map(k => k.close)
  const volumes = klines.map(k => k.volume)
  const price = closes[closes.length - 1]
  const atr = calcATR(klines, 14)

  const rsi = calcRSI(closes, 14)
  const macd = calcMACD(closes)
  const ema20 = calcEMA(closes, 20)
  const ema50 = calcEMA(closes, 50)
  const volChange = calcVolumeChange(volumes)

  if (!atr || !macd || ema20.length < 2 || ema50.length < 2) return null

  const currEma20 = ema20[ema20.length - 1]
  const currEma50 = ema50[ema50.length - 1]
  const prevEma20 = ema20[ema20.length - 2]
  const offset20 = ema20.length - ema50.length
  const prevEma50 = ema50[ema50.length - 2]

  const slMultiplier = 2.5
  const tpMultiplier = 5.0 // Wider TP for trend

  let action = 'WAIT'
  let entry = price
  let stopLoss, takeProfit, confidence = 0, reason = ''

  const aboveEma20 = price > currEma20
  const aboveEma50 = price > currEma50
  const ema20Above50 = currEma20 > currEma50
  const goldenCross = prevEma20 <= prevEma50 && currEma20 > currEma50
  const deathCross = prevEma20 >= prevEma50 && currEma20 < currEma50

  let bullScore = 0
  let bearScore = 0

  // Trend structure
  if (goldenCross) { bullScore += 3; reason += 'EMA20/50 golden cross + ' }
  else if (deathCross) { bearScore += 3; reason += 'EMA20/50 death cross + ' }
  else if (ema20Above50 && aboveEma20) { bullScore += 2; reason += 'Strong uptrend (price > EMA20 > EMA50) + ' }
  else if (!ema20Above50 && !aboveEma20) { bearScore += 2; reason += 'Strong downtrend (price < EMA20 < EMA50) + ' }
  else if (ema20Above50) { bullScore += 1; reason += 'Uptrend structure + ' }
  else { bearScore += 1; reason += 'Downtrend structure + ' }

  // MACD trend confirmation
  if (macd.bullish && macd.histogram > 0) { bullScore += 1; reason += 'MACD positive momentum + ' }
  else if (!macd.bullish && macd.histogram < 0) { bearScore += 1; reason += 'MACD negative momentum + ' }

  // RSI trend filter
  if (rsi > 50 && rsi < 70) { bullScore += 1; reason += 'RSI bullish zone + ' }
  else if (rsi < 50 && rsi > 30) { bearScore += 1; reason += 'RSI bearish zone + ' }

  // Volume trend
  if (volChange > 20) { reason += 'Volume confirming + ' }

  reason = reason.replace(/ \+ $/, '')

  if (bullScore >= 3) {
    action = 'BUY'
    stopLoss = price - atr * slMultiplier
    takeProfit = price + atr * tpMultiplier
    confidence = Math.min(1, 0.35 + bullScore * 0.1)
  }
  else if (bearScore >= 3) {
    action = 'SELL'
    stopLoss = price + atr * slMultiplier
    takeProfit = price - atr * tpMultiplier
    confidence = Math.min(1, 0.35 + bearScore * 0.1)
  }
  else {
    return {
      strategy: 'Trend',
      action: 'WAIT',
      entry: price,
      stopLoss: null,
      takeProfit: null,
      riskReward: null,
      confidence: 0,
      reason: 'No clear trend — sideways or transitioning',
      params: { rsi, macd: macd.bullish, ema20Above50, aboveEma20, atr },
    }
  }

  const risk = Math.abs(price - stopLoss)
  const reward = Math.abs(takeProfit - price)
  const riskReward = risk > 0 ? reward / risk : 0

  return {
    strategy: 'Trend',
    action,
    entry: price,
    stopLoss,
    takeProfit,
    riskReward,
    confidence,
    reason,
    params: { rsi, macd: macd.bullish, ema20Above50, aboveEma20, atr },
  }
}

// ============================================================
// Run all strategies and return combined result
// ============================================================
export function analyzeAllStrategies(klines) {
  return {
    scalping: scalping(klines),
    swing: swing(klines),
    trend: trendFollowing(klines),
  }
}
