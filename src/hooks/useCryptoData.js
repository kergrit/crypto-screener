import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchTopSymbols, fetchKlines, createPriceStream } from '../lib/binance'
import { calcCompositeSignal } from '../lib/indicators'

export function useCryptoData(timeframe = '1h', market = 'futures') {
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pinnedSymbols, setPinnedSymbols] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedSymbols') || '[]')
    } catch { return [] }
  })
  const wsRef = useRef(null)
  const intervalsRef = useRef([])
  const mountedRef = useRef(true)

  const togglePin = useCallback((symbol) => {
    setPinnedSymbols(prev => {
      const next = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
      localStorage.setItem('pinnedSymbols', JSON.stringify(next))
      return next
    })
  }, [])

  const fetchIndicators = useCallback(async (symbol, tf, mkt) => {
    try {
      const klines = await fetchKlines(symbol, tf, 100, mkt)
      const closes = klines.map(k => k.close)
      const volumes = klines.map(k => k.volume)
      const indicators = calcCompositeSignal(closes, volumes)
      // Last 24 close prices for sparkline
      const sparklineData = closes.slice(-24)
      return { indicators, sparklineData }
    } catch {
      return { indicators: null, sparklineData: null }
    }
  }, [])

  // REST-based price refresh (fallback for when WebSocket fails)
  const refreshPrices = useCallback(async () => {
    try {
      const fresh = await fetchTopSymbols(50, market)
      const priceMap = new Map(fresh.map(c => [c.symbol, c]))
      setCoins(prev => prev.map(coin => {
        const update = priceMap.get(coin.symbol)
        if (!update) return coin
        return {
          ...coin,
          prevPrice: coin.price,
          price: update.price,
          priceChange24h: update.priceChange24h,
          volume24h: update.volume24h,
          high24h: update.high24h,
          low24h: update.low24h,
        }
      }))
    } catch { /* silent */ }
  }, [market])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const topSymbols = await fetchTopSymbols(50, market)

      const batchSize = 5
      const results = [...topSymbols]

      for (let i = 0; i < results.length; i += batchSize) {
        if (!mountedRef.current) return
        const batch = results.slice(i, i + batchSize)
        const results_batch = await Promise.all(
          batch.map(coin => fetchIndicators(coin.symbol, timeframe, market))
        )
        batch.forEach((coin, idx) => {
          coin.indicators = results_batch[idx].indicators
          coin.sparklineData = results_batch[idx].sparklineData
        })
        setCoins([...results])

        if (i + batchSize < results.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      setCoins(results)
      setLoading(false)

      // Try WebSocket for real-time updates
      if (wsRef.current) wsRef.current.close()
      const symbols = results.map(c => c.symbol)

      try {
        wsRef.current = createPriceStream(symbols, (update) => {
          setCoins(prev => prev.map(coin => {
            if (coin.symbol !== update.symbol) return coin
            return {
              ...coin,
              prevPrice: coin.price,
              price: update.price,
              priceChange24h: update.priceChange24h,
              volume24h: update.volume24h,
              high24h: update.high24h,
              low24h: update.low24h,
            }
          }))
        }, market)
      } catch {
        // WebSocket failed, REST polling will handle updates
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [timeframe, market, fetchIndicators])

  const refreshIndicators = useCallback(async () => {
    const currentCoins = [...coins]
    const symbols = currentCoins.map(c => c.symbol)
    if (symbols.length === 0) return

    const batchSize = 5
    for (let i = 0; i < symbols.length; i += batchSize) {
      if (!mountedRef.current) return
      const batch = symbols.slice(i, i + batchSize)
      const results_batch = await Promise.all(
        batch.map(s => fetchIndicators(s, timeframe, market))
      )
      setCoins(current =>
        current.map(coin => {
          const batchIdx = batch.indexOf(coin.symbol)
          if (batchIdx === -1) return coin
          return {
            ...coin,
            indicators: results_batch[batchIdx].indicators || coin.indicators,
            sparklineData: results_batch[batchIdx].sparklineData || coin.sparklineData,
          }
        })
      )
      if (i + batchSize < symbols.length) {
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }, [coins, timeframe, market, fetchIndicators])

  useEffect(() => {
    mountedRef.current = true
    loadData()

    // REST price poll every 5s (works even if WebSocket fails)
    const priceInterval = setInterval(refreshPrices, 5000)
    // Refresh indicators every 60s
    const indicatorInterval = setInterval(refreshIndicators, 60000)
    intervalsRef.current = [priceInterval, indicatorInterval]

    return () => {
      mountedRef.current = false
      if (wsRef.current) wsRef.current.close()
      intervalsRef.current.forEach(clearInterval)
    }
  }, [loadData]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedCoins = [...coins].sort((a, b) => {
    const aPinned = pinnedSymbols.includes(a.symbol)
    const bPinned = pinnedSymbols.includes(b.symbol)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return b.volume24h - a.volume24h
  })

  return { coins: sortedCoins, loading, error, pinnedSymbols, togglePin }
}
