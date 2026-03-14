// Technical indicator calculations from OHLCV candlestick data

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null
  const changes = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

export function calcEMA(data, period) {
  if (data.length < period) return []
  const k = 2 / (period + 1)
  const ema = []

  // SMA for first value
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  ema.push(sum / period)

  for (let i = period; i < data.length; i++) {
    ema.push(data[i] * k + ema[ema.length - 1] * (1 - k))
  }
  return ema
}

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)

  if (emaSlow.length === 0 || emaFast.length === 0) return null

  // Align arrays
  const offset = emaFast.length - emaSlow.length
  const macdLine = []
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i])
  }

  const signalLine = calcEMA(macdLine, signal)
  if (signalLine.length === 0) return null

  const macdVal = macdLine[macdLine.length - 1]
  const signalVal = signalLine[signalLine.length - 1]
  const histogram = macdVal - signalVal

  const prevMacd = macdLine[macdLine.length - 2]
  const signalOffset = macdLine.length - signalLine.length
  const prevSignal = signalLine.length >= 2 ? signalLine[signalLine.length - 2] : signalVal

  return {
    macd: macdVal,
    signal: signalVal,
    histogram,
    crossUp: prevMacd <= prevSignal && macdVal > signalVal,
    crossDown: prevMacd >= prevSignal && macdVal < signalVal,
    bullish: macdVal > signalVal,
  }
}

export function calcBollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) return null

  const slice = closes.slice(-period)
  const sma = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
  const sd = Math.sqrt(variance)

  const upper = sma + stdDev * sd
  const lower = sma - stdDev * sd
  const current = closes[closes.length - 1]

  // %B indicator: where price is relative to bands (0 = lower, 1 = upper)
  const percentB = (current - lower) / (upper - lower)

  return { upper, middle: sma, lower, percentB }
}

export function calcVolumeChange(volumes) {
  if (volumes.length < 2) return null

  const current = volumes[volumes.length - 1]
  // Average of last 20 periods
  const lookback = Math.min(20, volumes.length - 1)
  const avgVol = volumes.slice(-lookback - 1, -1).reduce((a, b) => a + b, 0) / lookback
  if (avgVol === 0) return 0
  return ((current - avgVol) / avgVol) * 100
}

export function calcEMACross(closes) {
  const ema9 = calcEMA(closes, 9)
  const ema21 = calcEMA(closes, 21)

  if (ema9.length < 2 || ema21.length < 2) return null

  const offset = ema9.length - ema21.length
  const curr9 = ema9[ema9.length - 1]
  const curr21 = ema21[ema21.length - 1]
  const prev9 = ema9[ema9.length - 2]
  const prev21 = ema21[ema21.length - 2]

  return {
    ema9: curr9,
    ema21: curr21,
    bullish: curr9 > curr21,
    crossUp: prev9 <= prev21 + offset && curr9 > curr21,
    crossDown: prev9 >= prev21 && curr9 < curr21,
  }
}

// Composite signal from all indicators
export function calcCompositeSignal(closes, volumes) {
  const rsi = calcRSI(closes)
  const macd = calcMACD(closes)
  const bb = calcBollingerBands(closes)
  const emaCross = calcEMACross(closes)
  const volChange = calcVolumeChange(volumes)

  let bullCount = 0
  let bearCount = 0
  let total = 0

  // RSI
  if (rsi !== null) {
    total++
    if (rsi < 30) bullCount++       // Oversold = buy
    else if (rsi > 70) bearCount++  // Overbought = sell
    else if (rsi < 45) bullCount += 0.5
    else if (rsi > 55) bearCount += 0.5
  }

  // MACD
  if (macd) {
    total++
    if (macd.bullish) bullCount++
    else bearCount++
    if (macd.crossUp) bullCount += 0.5
    if (macd.crossDown) bearCount += 0.5
  }

  // Bollinger Bands
  if (bb) {
    total++
    if (bb.percentB < 0.2) bullCount++        // Near lower band
    else if (bb.percentB > 0.8) bearCount++   // Near upper band
    else if (bb.percentB < 0.4) bullCount += 0.5
    else if (bb.percentB > 0.6) bearCount += 0.5
  }

  // EMA Cross
  if (emaCross) {
    total++
    if (emaCross.bullish) bullCount++
    else bearCount++
    if (emaCross.crossUp) bullCount += 0.5
    if (emaCross.crossDown) bearCount += 0.5
  }

  // Volume (amplifier)
  if (volChange !== null) {
    total++
    // High volume confirms the direction
    if (volChange > 50) {
      if (bullCount > bearCount) bullCount += 0.5
      else if (bearCount > bullCount) bearCount += 0.5
    }
  }

  const score = total > 0 ? (bullCount - bearCount) / total : 0

  let signal, color
  if (score >= 0.6) { signal = 'STRONG BUY'; color = 'text-emerald-400' }
  else if (score >= 0.25) { signal = 'BUY'; color = 'text-green-400' }
  else if (score <= -0.6) { signal = 'STRONG SELL'; color = 'text-red-400' }
  else if (score <= -0.25) { signal = 'SELL'; color = 'text-orange-400' }
  else { signal = 'NEUTRAL'; color = 'text-gray-400' }

  return {
    rsi,
    macd,
    bb,
    emaCross,
    volChange,
    score,
    signal,
    color,
  }
}
