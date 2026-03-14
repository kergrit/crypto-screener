// Market type configs
const MARKET_CONFIG = {
  spot: {
    baseUrl: 'https://api.binance.com/api/v3',
    wsUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
    tickerEndpoint: '/ticker/24hr',
    klinesEndpoint: '/klines',
  },
  futures: {
    baseUrl: 'https://fapi.binance.com/fapi/v1',
    wsUrl: 'wss://fstream.binance.com/ws/!ticker@arr',
    tickerEndpoint: '/ticker/24hr',
    klinesEndpoint: '/klines',
  },
}

export const MARKET_TYPES = [
  { label: 'Futures', value: 'futures' },
  { label: 'Spot', value: 'spot' },
]

function getConfig(market = 'futures') {
  return MARKET_CONFIG[market] || MARKET_CONFIG.futures
}

// Fetch top trading pairs by 24h volume (USDT pairs only)
export async function fetchTopSymbols(limit = 50, market = 'futures') {
  const config = getConfig(market)
  const res = await fetch(`${config.baseUrl}${config.tickerEndpoint}`)
  const data = await res.json()

  return data
    .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('UP') && !t.symbol.includes('DOWN'))
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map(t => ({
      symbol: t.symbol,
      displayName: t.symbol.replace('USDT', ''),
      price: parseFloat(t.lastPrice),
      priceChange24h: parseFloat(t.priceChangePercent),
      volume24h: parseFloat(t.quoteVolume),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
    }))
}

// Fetch candlestick (kline) data for indicator calculation
export async function fetchKlines(symbol, interval = '1h', limit = 100, market = 'futures') {
  const config = getConfig(market)
  const res = await fetch(
    `${config.baseUrl}${config.klinesEndpoint}?symbol=${symbol}&interval=${interval}&limit=${limit}`
  )
  const data = await res.json()

  return data.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }))
}

// WebSocket for real-time price updates using the all-tickers stream
export function createPriceStream(symbols, onUpdate, market = 'futures') {
  const config = getConfig(market)
  const symbolSet = new Set(symbols.map(s => s.toUpperCase()))
  const ws = new WebSocket(config.wsUrl)

  ws.onmessage = (event) => {
    const tickers = JSON.parse(event.data)
    for (const data of tickers) {
      if (!symbolSet.has(data.s)) continue
      onUpdate({
        symbol: data.s,
        price: parseFloat(data.c),
        priceChange24h: parseFloat(data.P),
        volume24h: parseFloat(data.q),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
      })
    }
  }

  ws.onerror = () => {
    // Silent — REST polling fallback handles updates
  }

  return ws
}

// Map interval strings to Binance API format
export const TIMEFRAMES = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
]
