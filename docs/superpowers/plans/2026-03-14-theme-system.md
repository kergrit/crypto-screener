# Theme System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-theme glassmorphism switcher (Classic, Dark Glass, Deep Blue, Light Glass) using CSS variables + Tailwind extension, with localStorage persistence and default set to Classic.

**Architecture:** CSS custom properties scoped to `[data-theme]` selectors define all color/blur/shadow tokens. Tailwind config extends its color palette to reference these variables. Components swap hardcoded Tailwind classes for theme-aware utility classes. A `data-theme` attribute on the root `<html>` element controls which theme is active.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, CSS Custom Properties, localStorage

**Spec:** `docs/superpowers/specs/2026-03-14-theme-system-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `src/lib/themes.js` | Create | Theme metadata (key, label, dot color) and THEMES array export |
| `src/index.css` | Modify | Add 4 `[data-theme]` CSS variable blocks after existing styles |
| `tailwind.config.js` | Modify | Extend colors/backdropBlur/boxShadow with CSS var references |
| `src/App.jsx` | Modify | Add theme state + switcher UI + set `data-theme` on `<html>`, migrate classes |
| `src/components/CoinRow.jsx` | Modify | Replace hardcoded color classes with theme utilities |
| `src/components/DetailPanel.jsx` | Modify | Replace hardcoded color classes with theme utilities |
| `src/components/StrategyPanel.jsx` | Modify | Replace hardcoded color classes with theme utilities |
| `src/components/BacktestDashboard.jsx` | Modify | Replace hardcoded color classes with theme utilities |
| `src/components/AddCoinModal.jsx` | Modify | Replace hardcoded color classes with theme utilities |
| `src/components/SignalBadge.jsx` | Modify | Minor — keep signal-specific colors, no theme-level change needed |
| `src/components/Sparkline.jsx` | Modify | Minimal — use CSS vars for sparkline fallback bg |

---

## Task 1: Create Theme Metadata

**Files:**
- Create: `src/lib/themes.js`

- [ ] **Step 1: Create themes.js with theme definitions**

```js
// src/lib/themes.js
export const THEMES = [
  { key: 'classic', label: 'Classic', dot: '#6b7280' },
  { key: 'dark-glass', label: 'Dark Glass', dot: '#3b82f6' },
  { key: 'deep-blue', label: 'Deep Blue', dot: '#8b5cf6' },
  { key: 'light-glass', label: 'Light Glass', dot: '#e2e8f0' },
]

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored && THEMES.some(t => t.key === stored)) return stored
  } catch { /* ignore */ }
  return 'classic'
}

export function setTheme(key) {
  document.documentElement.setAttribute('data-theme', key)
  try { localStorage.setItem('theme', key) } catch { /* ignore */ }
}
```

- [ ] **Step 2: Verify file exists**

Run: `cat src/lib/themes.js`
Expected: File contents shown without errors

---

## Task 2: Add CSS Variables for All 4 Themes

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add all 4 theme variable blocks after existing styles**

Append the following after the existing `.flash-down` rule at the end of `src/index.css`:

```css
/* ========= Theme Variables ========= */

/* Classic — preserves the original dark flat look */
[data-theme="classic"], :root {
  --bg-page: #030712;
  --bg-page-gradient: none;
  --glass-bg: rgba(31, 41, 55, 0.5);
  --glass-border: rgba(55, 65, 81, 0.3);
  --glass-blur: 0px;
  --glass-shadow: none;
  --card-bg: rgba(17, 24, 39, 0.5);
  --card-border: rgba(55, 65, 81, 0.5);
  --card-hover: rgba(31, 41, 55, 0.5);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.2);
  --accent-hover: #2563eb;
  --row-border: rgba(31, 41, 55, 0.5);
  --row-hover: rgba(31, 41, 55, 0.5);
  --header-bg: rgba(3, 7, 18, 0.8);
  --modal-bg: #111827;
  --modal-border: rgba(55, 65, 81, 0.5);
  --modal-backdrop: rgba(0, 0, 0, 0.7);
  --green: #4ade80;
  --red: #f87171;
  --amber: #fbbf24;
}

/* Dark Glass — frosted glass with subtle blue/purple ambient light */
[data-theme="dark-glass"] {
  --bg-page: #030712;
  --bg-page-gradient: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 12px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --card-bg: rgba(255, 255, 255, 0.03);
  --card-border: rgba(255, 255, 255, 0.08);
  --card-hover: rgba(255, 255, 255, 0.08);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.15);
  --accent-hover: #60a5fa;
  --row-border: rgba(255, 255, 255, 0.05);
  --row-hover: rgba(255, 255, 255, 0.05);
  --header-bg: rgba(3, 7, 18, 0.6);
  --modal-bg: rgba(17, 24, 39, 0.8);
  --modal-border: rgba(255, 255, 255, 0.1);
  --modal-backdrop: rgba(0, 0, 0, 0.6);
  --green: #4ade80;
  --red: #f87171;
  --amber: #fbbf24;
}

/* Deep Blue — purple-tinted glass with galaxy gradient */
[data-theme="deep-blue"] {
  --bg-page: #0a0e27;
  --bg-page-gradient: linear-gradient(135deg, #0a0e27 0%, #1a0533 50%, #0a0e27 100%);
  --glass-bg: rgba(139, 92, 246, 0.08);
  --glass-border: rgba(139, 92, 246, 0.2);
  --glass-blur: 16px;
  --glass-shadow: 0 8px 32px rgba(139, 92, 246, 0.1);
  --card-bg: rgba(139, 92, 246, 0.05);
  --card-border: rgba(139, 92, 246, 0.15);
  --card-hover: rgba(139, 92, 246, 0.12);
  --text-primary: #e2e8f0;
  --text-secondary: #a78bfa;
  --text-muted: #7c3aed;
  --accent: #8b5cf6;
  --accent-glow: rgba(139, 92, 246, 0.2);
  --accent-hover: #a78bfa;
  --row-border: rgba(139, 92, 246, 0.1);
  --row-hover: rgba(139, 92, 246, 0.08);
  --header-bg: rgba(10, 14, 39, 0.7);
  --modal-bg: rgba(10, 14, 39, 0.9);
  --modal-border: rgba(139, 92, 246, 0.2);
  --modal-backdrop: rgba(0, 0, 0, 0.7);
  --green: #4ade80;
  --red: #f87171;
  --amber: #fbbf24;
}

/* Light Glass — white frosted glass, light background */
[data-theme="light-glass"] {
  --bg-page: #f0f4ff;
  --bg-page-gradient: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%);
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.8);
  --glass-blur: 8px;
  --glass-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  --card-bg: rgba(255, 255, 255, 0.6);
  --card-border: rgba(200, 210, 230, 0.5);
  --card-hover: rgba(255, 255, 255, 0.9);
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent: #2563eb;
  --accent-glow: rgba(37, 99, 235, 0.1);
  --accent-hover: #1d4ed8;
  --row-border: rgba(200, 210, 230, 0.4);
  --row-hover: rgba(255, 255, 255, 0.5);
  --header-bg: rgba(240, 244, 255, 0.8);
  --modal-bg: rgba(255, 255, 255, 0.9);
  --modal-border: rgba(200, 210, 230, 0.5);
  --modal-backdrop: rgba(0, 0, 0, 0.3);
  --green: #16a34a;
  --red: #dc2626;
  --amber: #d97706;
}

/* Glass utility class — used by components that need backdrop-blur + glass bg */
.glass-panel {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow);
}
```

- [ ] **Step 2: Verify CSS is valid**

Run: `npm run build`
Expected: Build succeeds without errors

---

## Task 3: Extend Tailwind Config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Add theme-aware colors, blur, and shadow**

Replace the entire `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
        card: {
          bg: 'var(--card-bg)',
          border: 'var(--card-border)',
          hover: 'var(--card-hover)',
        },
        t: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          glow: 'var(--accent-glow)',
          hover: 'var(--accent-hover)',
        },
        row: {
          border: 'var(--row-border)',
          hover: 'var(--row-hover)',
        },
        modal: {
          bg: 'var(--modal-bg)',
          border: 'var(--modal-border)',
          backdrop: 'var(--modal-backdrop)',
        },
        signal: {
          green: 'var(--green)',
          red: 'var(--red)',
          amber: 'var(--amber)',
        },
      },
      backgroundColor: {
        header: 'var(--header-bg)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify Tailwind processes new config**

Run: `npm run build`
Expected: Build succeeds without errors

---

## Task 4: Update App.jsx — Theme State, Switcher UI, and Class Migration

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports and theme initialization**

Add to imports at top:

```jsx
import { THEMES, getInitialTheme, setTheme } from './lib/themes'
```

Add inside `App()` function, after existing state declarations:

```jsx
const [theme, setThemeState] = useState(() => {
  const initial = getInitialTheme()
  setTheme(initial) // Set data-theme on HTML element immediately
  return initial
})

const handleThemeChange = (key) => {
  setThemeState(key)
  setTheme(key)
}
```

- [ ] **Step 2: Add theme switcher to the header**

Insert after the Market type toggle `</div>` (line ~137), before the Timeframe selector comment:

```jsx
{/* Theme switcher */}
<div className="flex items-center gap-1 bg-glass-bg rounded-lg p-1 border border-glass-border">
  {THEMES.map(t => (
    <button
      key={t.key}
      onClick={() => handleThemeChange(t.key)}
      title={t.label}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
        theme === t.key
          ? 'ring-2 ring-accent scale-110'
          : 'hover:bg-card-hover opacity-60 hover:opacity-100'
      }`}
    >
      <span
        className="w-3.5 h-3.5 rounded-full border border-white/20"
        style={{ backgroundColor: t.dot }}
      />
    </button>
  ))}
</div>
```

- [ ] **Step 3: Migrate all hardcoded classes in App.jsx**

Apply these class replacements throughout App.jsx:

**Root container (line 99):**
```
Before: className="min-h-screen bg-gray-950 text-gray-100"
After:  className="min-h-screen bg-page text-t-primary" style={{ backgroundImage: 'var(--bg-page-gradient)' }}
```

**Header (line 101):**
```
Before: className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40"
After:  className="border-b border-glass-border bg-header backdrop-blur-sm sticky top-0 z-40"
```

**Title text (line 104):**
```
Before: text-white → text-t-primary
```

**Market toggle container (line 121):**
```
Before: bg-gray-800/50 → bg-glass-bg border border-glass-border
```

**Market toggle inactive button (line 131):**
```
Before: text-gray-400 hover:text-white hover:bg-gray-700/50
After:  text-t-secondary hover:text-t-primary hover:bg-card-hover
```

**Timeframe toggle container (line 140):**
```
Before: bg-gray-800/50 → bg-glass-bg
```

**Timeframe inactive button (line 148):**
```
Before: text-gray-400 hover:text-white hover:bg-gray-700/50
After:  text-t-secondary hover:text-t-primary hover:bg-card-hover
```

**MarketSummary cards (6 instances, lines 31, 41, 49, 59, 65, 71):**
```
Before: bg-gray-800/50 rounded-lg p-3 border border-gray-700/30
After:  glass-panel rounded-lg p-3 border
```

**MarketSummary labels (text-gray-500):**
```
Before: text-gray-500 → text-t-muted
```

**MarketSummary bold text (text-white):**
```
Before: text-white → text-t-primary
```

**MarketSummary semantic colors — KEEP AS-IS:**
- `text-green-400`, `text-red-400`, `text-emerald-400` — these are signal colors, keep hardcoded

**Signal filter bar (line 172):**
```
Before: text-gray-500 → text-t-muted
```

**Signal filter inactive (line 180):**
```
Before: text-gray-500 border-gray-700/50 hover:text-gray-300 hover:border-gray-600
After:  text-t-muted border-glass-border hover:text-t-secondary hover:border-t-secondary
```

**Screener table container (line 199):**
```
Before: bg-gray-900/50 border border-gray-800/50
After:  bg-card-bg border border-card-border glass-panel
```

**Table header (line 203):**
```
Before: border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-500
After:  border-b border-row-border text-[11px] uppercase tracking-wider text-t-muted
```

**Loading spinner text (line 222):**
```
Before: text-gray-500 → text-t-muted
```

**Add coin section (line 244):**
```
Before: border-t border-gray-800/50
After:  border-t border-row-border
```

**Add coin button (line 247):**
```
Before: text-gray-500 hover:text-blue-400 hover:bg-gray-800/50
After:  text-t-muted hover:text-accent hover:bg-card-hover
```

**Modal backdrop (line 256):**
```
Before: bg-black/70 → bg-modal-backdrop
```

**Modal container (line 258):**
```
Before: bg-gray-900 border border-gray-700/50
After:  bg-modal-bg border border-modal-border glass-panel
```

**Modal header (line 262):**
```
Before: border-b border-gray-800/50 → border-b border-row-border
```

**Modal coin name (line 264):**
```
Before: text-white → text-t-primary
```

**Modal tab bar container (line 277):**
```
Before: bg-gray-800/50 → bg-glass-bg
```

**Modal tab inactive (line 289):**
```
Before: text-gray-400 hover:text-white hover:bg-gray-700/50
After:  text-t-secondary hover:text-t-primary hover:bg-card-hover
```

**Modal close button (line 298):**
```
Before: text-gray-400 hover:text-white hover:bg-gray-700/50
After:  text-t-secondary hover:text-t-primary hover:bg-card-hover
```

**Modal footer (line 319):**
```
Before: border-t border-gray-800/50 ... text-gray-600
After:  border-t border-row-border ... text-t-muted
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds without errors

---

## Task 5: Update CoinRow.jsx

**Files:**
- Modify: `src/components/CoinRow.jsx`

- [ ] **Step 1: Migrate hardcoded classes**

Apply these replacements:

**RSIBar null state (line 19):**
```
Before: text-gray-600 → text-t-muted
```

**RSIBar track (line 31):**
```
Before: bg-gray-800 → bg-card-bg
```

**MACD/EMA null (lines 42, 54):**
```
Before: text-gray-600 → text-t-muted
```

**Table row (line 81):**
```
Before: border-b border-gray-800/50 hover:bg-gray-800/50 ... bg-gray-800/70
After:  border-b border-row-border hover:bg-row-hover ... bg-row-hover
```

**Pin unpinned (line 88):**
```
Before: text-gray-700 hover:text-gray-500
After:  text-t-muted hover:text-t-secondary
```

**Coin name (line 96):**
```
Before: text-white → text-t-primary
```

**Pair suffix (line 97):**
```
Before: text-gray-500 → text-t-muted
```

**Volume (line 116):**
```
Before: text-gray-400 → text-t-secondary
```

**Loading text (line 147):**
```
Before: text-gray-600 → text-t-muted
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 6: Update DetailPanel.jsx

**Files:**
- Modify: `src/components/DetailPanel.jsx`

- [ ] **Step 1: Migrate hardcoded classes**

**IndicatorCard container (line 5):**
```
Before: bg-gray-800/50 rounded-lg p-4 border border-gray-700/50
After:  glass-panel rounded-lg p-4 border
```

**IndicatorCard label (line 6):**
```
Before: text-gray-500 → text-t-muted
```

**All "No data" text (lines 13, 49, 81, 112, 136):**
```
Before: text-gray-600 → text-t-muted
```

**RSIGauge value text (line 25):**
```
Before: text-white → text-t-primary
```

**RSIGauge track bg (line 28):**
```
Before: bg-gray-700 → bg-card-bg
```

**All `text-gray-500` labels (lines 32, 41, 55, 60, 65, 92, 96, 100, 118, 122, 148, 192):**
```
Before: text-gray-500 → text-t-muted
```

**MACD signal text (line 62):**
```
Before: text-gray-300 → text-t-secondary
```

**BB middle (line 97), RSIGauge neutral (line 20):**
```
Before: text-gray-300 → text-t-secondary
```

**VolumeDetail value (line 146), composite score panel title (line 162):**
```
Before: text-white → text-t-primary
```

**Loading text (line 156):**
```
Before: text-gray-500 → text-t-muted
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 7: Update StrategyPanel.jsx

**Files:**
- Modify: `src/components/StrategyPanel.jsx`

- [ ] **Step 1: Migrate hardcoded classes**

**ConfidenceBar track (line 21):**
```
Before: bg-gray-800 → bg-card-bg
```

**ConfidenceBar text (line 24):**
```
Before: text-gray-400 → text-t-secondary
```

**StrategyCard WAIT colors (line 39):**
```
Before: text-gray-400 border-gray-700/50 bg-gray-800/30
After:  text-t-secondary border-glass-border bg-card-bg
```

**StrategyCard gray-500 (line 48):**
```
Before: text-gray-500 → text-t-muted
```

**StrategyCard Entry/TP/SL labels (lines 58, 62, 66):**
```
Before: text-gray-500 → text-t-muted
```

**StrategyCard white text (line 59):**
```
Before: text-white → text-t-primary
```

**StrategyCard R:R label (line 72):**
```
Before: text-gray-500 → text-t-muted
```

**StrategyCard reason text (line 85):**
```
Before: text-gray-400 → text-t-secondary
```

**Panel title (line 118):**
```
Before: text-white → text-t-primary
```

**Panel subtitle (line 119):**
```
Before: text-gray-500 → text-t-muted
```

**Loading text (line 125):**
```
Before: text-gray-500 → text-t-muted
```

**No data text (line 146):**
```
Before: text-gray-500 → text-t-muted
```

**Disclaimer (line 150):**
```
Before: text-gray-600 → text-t-muted
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 8: Update BacktestDashboard.jsx

**Files:**
- Modify: `src/components/BacktestDashboard.jsx`

- [ ] **Step 1: Migrate hardcoded classes**

**StatBox label (line 13):**
```
Before: text-gray-500 → text-t-muted
```

**StatBox value default (line 14):**
```
Before: text-white → text-t-primary
```

**StatBox sub (line 15):**
```
Before: text-gray-500 → text-t-muted
```

**StrategyResult container (line 58):**
```
Before: bg-gray-800/50 rounded-xl border p-4 ... border-gray-700/40
After:  glass-panel rounded-xl border p-4 ... border-card-border
```

**StrategyResult name (line 61):**
```
Before: text-white → text-t-primary
```

**Trade list border (line 102):**
```
Before: border-t border-gray-700/50 → border-t border-row-border
```

**Trade list label (line 103):**
```
Before: text-gray-500 → text-t-muted
```

**Trade exit text (line 112):**
```
Before: text-gray-600 → text-t-muted
```

**Trade price text (line 108):**
```
Before: text-gray-500 → text-t-muted
```

**Panel title (line 178):**
```
Before: text-white → text-t-primary
```

**Period selector container (line 181):**
```
Before: bg-gray-800/50 → bg-glass-bg
```

**Period selector inactive (line 189):**
```
Before: text-gray-400 hover:text-white hover:bg-gray-700/50
After:  text-t-secondary hover:text-t-primary hover:bg-card-hover
```

**Config info (line 199):**
```
Before: text-gray-500 → text-t-muted
```

**Loading text (line 209):**
```
Before: text-gray-500 → text-t-muted
```

**No data text (line 218):**
```
Before: text-gray-500 → text-t-muted
```

**Summary section (line 224):**
```
Before: text-gray-400 → text-t-secondary
```

**Disclaimer (line 233):**
```
Before: text-gray-600 → text-t-muted
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 9: Update AddCoinModal.jsx

**Files:**
- Modify: `src/components/AddCoinModal.jsx`

- [ ] **Step 1: Migrate hardcoded classes**

**Backdrop (line 34):**
```
Before: bg-black/60 → bg-modal-backdrop
```

**Modal container (line 35):**
```
Before: bg-gray-900 border border-gray-700
After:  bg-modal-bg border border-modal-border glass-panel
```

**Title (line 36):**
```
Before: text-white → text-t-primary
```

**Input (line 38-42):**
```
Before: bg-gray-800 border-gray-600 ... text-white placeholder-gray-500 ... focus:border-blue-500
After:  bg-card-bg border-card-border ... text-t-primary placeholder-t-muted ... focus:border-accent
```

**Loading text (line 47):**
```
Before: text-gray-500 → text-t-muted
```

**No results text (line 49):**
```
Before: text-gray-500 → text-t-muted
```

**Result button (line 55):**
```
Before: hover:bg-gray-800 → hover:bg-card-hover
```

**Result coin name (line 57):**
```
Before: text-white → text-t-primary
```

**Result pair text (line 57):**
```
Before: text-gray-500 → text-t-muted
```

**Cancel button (line 64-65):**
```
Before: bg-gray-800 text-gray-400 ... hover:bg-gray-700
After:  bg-card-bg text-t-secondary ... hover:bg-card-hover
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 10: Update Sparkline.jsx (Minimal)

**Files:**
- Modify: `src/components/Sparkline.jsx`

- [ ] **Step 1: Update placeholder background**

```
Before (line 3): bg-gray-800/30 → bg-card-bg
```

No other changes needed — sparkline SVG colors are computed from data, not theme.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 11: Final Verification

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds without errors or warnings

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`

Check in browser:
1. Default theme should be Classic (looks same as before)
2. Click each theme dot in header — entire UI switches instantly
3. Refresh page — selected theme persists
4. Dark Glass: cards have subtle blur, luminous borders, ambient gradient behind page
5. Deep Blue: purple-tinted glass, galaxy gradient background
6. Light Glass: white/light background, white frosted cards, dark text
7. All modals, the detail panel, strategy cards, and backtest dashboard render correctly in every theme
8. Signal colors (green/red for buy/sell) remain readable in all themes
