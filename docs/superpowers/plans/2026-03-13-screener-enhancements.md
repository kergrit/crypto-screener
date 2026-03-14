# Crypto Screener Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the existing crypto screener with top 50 coins, clickable signal filters, and sparkline mini-charts.

**Architecture:** Three incremental changes to the existing React + Vite + Tailwind app. Signal filter is state in App.jsx passed down. Sparkline is a new SVG component rendered from existing klines data. All changes are purely client-side.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Binance REST/WebSocket API, inline SVG for sparklines.

---

## Chunk 1: Core Enhancements

### Task 1: Increase coin limit from 30 to 50

**Files:**
- Modify: `src/lib/binance.js:5` — change default param
- Modify: `src/hooks/useCryptoData.js:43,65` — change hardcoded 30 to 50

- [ ] **Step 1: Update `fetchTopSymbols` default to 50**

In `src/lib/binance.js` line 5:
```js
export async function fetchTopSymbols(limit = 50) {
```

- [ ] **Step 2: Update `refreshPrices` and `loadData` calls to 50**

In `src/hooks/useCryptoData.js`:
- Line 43: `const fresh = await fetchTopSymbols(50)`
- Line 65: `const topSymbols = await fetchTopSymbols(50)`

- [ ] **Step 3: Verify dev server loads 50 coins**

Run: `npm run dev`
Expected: Dashboard shows 50 coins instead of 30.

- [ ] **Step 4: Commit**

```bash
git add src/lib/binance.js src/hooks/useCryptoData.js
git commit -m "feat: increase default coin limit to 50"
```

---

### Task 2: Add signal filter functionality

**Files:**
- Modify: `src/App.jsx` — add `signalFilter` state, filter bar UI, pass filter to table
- Modify: `src/components/SignalBadge.jsx` — make clickable with `onClick` prop

- [ ] **Step 1: Add signal filter state and filter bar to App.jsx**

Add state: `const [signalFilter, setSignalFilter] = useState(null)`

Add filter bar between MarketSummary and table with buttons: ALL, STRONG BUY, BUY, NEUTRAL, SELL, STRONG SELL.

Filter coins before rendering: `const filteredCoins = signalFilter ? coins.filter(c => c.indicators?.signal === signalFilter) : coins`

- [ ] **Step 2: Make SignalBadge clickable**

Add optional `onClick` prop to SignalBadge. When clicked in the table row, it sets `signalFilter` to that signal type. Add `cursor-pointer hover:opacity-80` when onClick is provided.

- [ ] **Step 3: Update CoinRow to pass signal click handler**

Pass `onSignalClick` prop from App → CoinRow → SignalBadge. Stop propagation so it doesn't trigger row selection.

- [ ] **Step 4: Verify filter works**

Run: `npm run dev`
Expected: Clicking a signal badge filters the table. Clicking "ALL" removes filter. Active filter is highlighted.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/SignalBadge.jsx src/components/CoinRow.jsx
git commit -m "feat: add clickable signal filter for buy/sell"
```

---

### Task 3: Add sparkline mini-chart

**Files:**
- Create: `src/components/Sparkline.jsx` — SVG sparkline component
- Modify: `src/hooks/useCryptoData.js` — store klines close prices for sparkline
- Modify: `src/lib/binance.js` — export function to fetch mini klines (24 candles)
- Modify: `src/components/CoinRow.jsx` — add sparkline column
- Modify: `src/App.jsx` — add sparkline column header

- [ ] **Step 1: Create Sparkline component**

Create `src/components/Sparkline.jsx`: A pure SVG component that takes an array of close prices and renders a mini line chart (80×32px). Color green if last > first, red otherwise. Smooth polyline path.

```jsx
export default function Sparkline({ data, width = 80, height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const color = data[data.length - 1] >= data[0] ? '#4ade80' : '#f87171'

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}
```

- [ ] **Step 2: Store sparkline data in useCryptoData**

In `fetchIndicators`, also return the last 24 close prices as `sparklineData`. Store in coin object alongside indicators.

- [ ] **Step 3: Add sparkline column to CoinRow and App table header**

Add a "Chart" column between "24h %" and "Volume" columns. Render `<Sparkline data={coin.sparklineData} />`.

- [ ] **Step 4: Verify sparklines render**

Run: `npm run dev`
Expected: Each coin row shows a mini sparkline chart colored green/red based on trend.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sparkline.jsx src/hooks/useCryptoData.js src/components/CoinRow.jsx src/App.jsx
git commit -m "feat: add sparkline mini-charts to coin rows"
```

---

### Task 4: Final verification and build

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: production build verification"
```
