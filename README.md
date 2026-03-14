# Crypto Screener

Real-time cryptocurrency screener dashboard with technical indicators, trading strategies, and backtesting.

## Features

- **Real-time prices** — WebSocket streaming from Binance with REST fallback
- **Spot & Futures markets** — Toggle between Binance Spot and Futures
- **Technical indicators** — RSI(14), EMA 9/21 cross, MACD(12,26,9), Bollinger Bands(20,2), Volume analysis
- **Composite signals** — STRONG BUY / BUY / NEUTRAL / SELL / STRONG SELL based on 5 weighted indicators
- **Strategy recommendations** — Scalping, Swing, and Trend strategies with entry/TP/SL/R:R
- **Backtesting** — Simulate strategies over 1W/1M/3M/6M with equity curves and performance stats
- **Liquid Glass themes** — 4 switchable themes with Apple-style glassmorphism effects
- **Watchlist** — Pin favorite coins, add custom pairs from Binance
- **Sparkline charts** — Inline 7-day price trend mini-charts

## Themes

| Theme | Description |
|-------|-------------|
| Classic | Original flat dark look, no blur |
| Dark Glass | Frosted glass with blue/cyan ambient light, prismatic edges |
| Deep Blue | Galaxy gradient with purple glass and specular highlights |
| Light Glass | White frosted glass on light background |

## Tech Stack

- React 18 + Vite 5
- Tailwind CSS 3
- Binance Public API (no API key needed)
- Client-side only — no backend required

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output is in `dist/` — ready to deploy to any static hosting (Vercel, Netlify, etc.)

## Data Sources

All data comes from Binance's public REST and WebSocket APIs:
- Spot: `api.binance.com`
- Futures: `fapi.binance.com`

No API keys or authentication required.

## Disclaimer

For educational purposes only. Not financial advice. Always do your own research before trading.
