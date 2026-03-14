# Crypto Screener

## Tech Stack
- React 18 + Vite 5 + Tailwind CSS 3
- ES Modules (`"type": "module"` in package.json)
- No backend — client-side only

## Data Source
- Binance Public API (no API key needed)
- Spot REST: `api.binance.com/api/v3` for ticker + klines
- Futures REST: `fapi.binance.com/fapi/v1` for futures data
- WebSocket: `wss://stream.binance.com:9443/ws/!ticker@arr` (spot), `wss://fstream.binance.com/ws/!ticker@arr` (futures)
- REST polling every 5s as WebSocket fallback

## Project Structure
```
bin/
  crypto-screener.mjs   — CLI for background server (start/stop/restart/status/update/logs)
src/
  App.jsx              — Main dashboard layout, market summary, theme switcher
  main.jsx             — Entry point
  index.css            — Tailwind directives, flash animations, theme CSS variables, Liquid Glass styles
  lib/
    binance.js         — Binance API + WebSocket (supports spot & futures via market param)
    indicators.js      — Technical indicator calculations (RSI, EMA, MACD, BB, Volume)
    strategies.js      — Trading strategy analysis (scalping, swing, trend)
    backtest.js        — Backtesting engine with equity curve tracking
    themes.js          — Theme metadata, localStorage persistence, DOM theme setter
  hooks/
    useCryptoData.js   — Main data hook (fetch, WebSocket, polling, pin state)
  components/
    CoinRow.jsx        — Table row with price flash + indicator badges
    DetailPanel.jsx    — Expanded indicator detail view (RSI gauge, MACD, BB, EMA, Volume)
    SignalBadge.jsx    — Signal label component (STRONG BUY/BUY/NEUTRAL/SELL/STRONG SELL)
    Sparkline.jsx      — Mini SVG sparkline chart with gradient fill
    AddCoinModal.jsx   — Search + add coin to watchlist
    StrategyPanel.jsx  — Position recommendations (scalping/swing/trend) with entry/TP/SL
    BacktestDashboard.jsx — Backtest simulation with equity charts and strategy comparison
```

## Theme System
- 4 themes: Classic (flat dark), Dark Glass, Deep Blue, Light Glass
- Uses CSS custom properties on `[data-theme]` attribute on `<html>`
- Tailwind extended with CSS variable references (e.g., `bg-page`, `text-t-primary`, `bg-glass-bg`)
- `.glass-panel` CSS class provides backdrop-blur, specular highlights, and prismatic edge effects
- Liquid Glass effects: heavy blur (24-32px), `saturate(1.8)`, `::before` specular highlight, `::after` rainbow prismatic edge
- Animated ambient glow orbs on dark glass themes via `body::before/::after`
- Theme preference persisted in localStorage
- Signal/semantic colors (green/red/amber) stay consistent except Light Glass (adjusted for contrast)

## Key Decisions
- Composite signal calculated from 5 indicators weighted equally
- Pinned coins stored in localStorage
- Indicators refresh every 60s via REST, prices every 5s
- Klines fetched in batches of 5 with 300ms delay to respect rate limits
- Futures market is default (set in App.jsx state init)
- All color classes use theme-aware tokens — never hardcode gray-800 etc. for backgrounds/text
- Signal colors (emerald, green, red, orange, amber) remain hardcoded intentionally

## Commands
- `npm run dev` — Start dev server (development with HMR)
- `npm run build` — Production build
- `crypto-screener start` — Build and serve on port 9212 as background process
- `crypto-screener stop` — Stop background server
- `crypto-screener restart` — Restart server (stop + start)
- `crypto-screener status` — Show server status (running/stopped, port, uptime)
- `crypto-screener update` — Pull, install, rebuild, restart
- `crypto-screener logs` — Tail server logs
- `crypto-screener --version` — Show version
- Install CLI globally: `npm link` (from project root)
