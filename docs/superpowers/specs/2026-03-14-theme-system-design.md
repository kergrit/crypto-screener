# Theme System Design — Liquid Gloss

## Summary

Add a theme switcher to the Crypto Screener with 4 glassmorphism-inspired themes. Users can toggle between themes via a header control, and the preference persists in localStorage.

## Approach

**CSS Variables + Tailwind Extension** (Approach C). Define theme tokens as CSS custom properties scoped to `[data-theme]` selectors. Extend Tailwind config to reference these variables. Components swap hardcoded Tailwind color classes for theme-aware utilities. Changing `data-theme` on the root element switches the entire UI instantly.

## Themes

| Key | Name | Background | Glass Effect |
|-----|------|-----------|-------------|
| `classic` | Classic | `gray-950` solid | `gray-800/50` flat panels (current look) |
| `dark-glass` | Dark Glass | `gray-950` + subtle radial gradient | Frosted glass + `blur(12px)` + luminous borders |
| `deep-blue` | Deep Blue | `#0a0e27` to `#1a0533` gradient | Purple-tinted glass + glow borders |
| `light-glass` | Light Glass | `#f0f4ff` light gradient | White frosted glass + soft drop-shadows |

## CSS Variable Categories

```
Background:    --bg-page, --bg-page-gradient
Glass:         --glass-bg, --glass-border, --glass-blur, --glass-shadow
Cards:         --card-bg, --card-border, --card-hover
Text:          --text-primary, --text-secondary, --text-muted
Accent:        --accent, --accent-glow, --accent-hover
Table:         --row-border, --row-hover, --header-bg
Modal:         --modal-bg, --modal-border, --modal-backdrop
Semantic:      --green, --red, --amber (same across dark themes; adjusted for light)
```

## Theme Variable Values

### Classic (default — preserves current look)
```css
[data-theme="classic"] {
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
```

### Dark Glass
```css
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
```

### Deep Blue
```css
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
```

### Light Glass
```css
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
```

## Tailwind Config Extension

```js
// tailwind.config.js — extend section
colors: {
  page: 'var(--bg-page)',
  glass: { bg: 'var(--glass-bg)', border: 'var(--glass-border)' },
  card: { bg: 'var(--card-bg)', border: 'var(--card-border)', hover: 'var(--card-hover)' },
  t: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)' },
  accent: { DEFAULT: 'var(--accent)', glow: 'var(--accent-glow)', hover: 'var(--accent-hover)' },
  row: { border: 'var(--row-border)', hover: 'var(--row-hover)' },
  modal: { bg: 'var(--modal-bg)', border: 'var(--modal-border)', backdrop: 'var(--modal-backdrop)' },
  signal: { green: 'var(--green)', red: 'var(--red)', amber: 'var(--amber)' },
},
backdropBlur: {
  glass: 'var(--glass-blur)',
},
boxShadow: {
  glass: 'var(--glass-shadow)',
},
```

## Theme Switcher UI

Located in the header bar, next to the Market toggle. A compact dropdown or inline buttons showing 4 options with color-coded dots:

- Classic — gray dot
- Dark Glass — blue dot
- Deep Blue — purple dot
- Light Glass — white dot

Theme preference stored in `localStorage` key `theme`, default `classic`.

## Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/themes.js` | New | Theme metadata: key, label, dot color, preview description |
| `src/index.css` | Modified | Add 4 `[data-theme]` CSS variable blocks |
| `tailwind.config.js` | Modified | Extend with theme-aware color/blur/shadow utilities |
| `src/App.jsx` | Modified | Add theme state, switcher UI, set `data-theme` on root |
| `src/components/CoinRow.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/DetailPanel.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/StrategyPanel.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/BacktestDashboard.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/AddCoinModal.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/SignalBadge.jsx` | Modified | Replace hardcoded colors with theme utilities |
| `src/components/Sparkline.jsx` | Modified | Minimal — sparkline colors may reference theme vars |

## What Does NOT Change

- All logic (hooks, API calls, indicators, strategies, backtest engine)
- Layout and structure of table, modal, panels
- Signal colors in dark themes (green/red/amber stay the same)
- Functionality and data flow

## Class Migration Examples

```
Before (hardcoded):                    After (theme-aware):
bg-gray-950                     →     bg-page
bg-gray-800/50                  →     bg-glass-bg backdrop-blur-glass
border-gray-700/30              →     border-glass-border
bg-gray-900/50                  →     bg-card-bg
border-gray-800/50              →     border-card-border
hover:bg-gray-800/50            →     hover:bg-card-hover
text-white                      →     text-t-primary
text-gray-500                   →     text-t-muted
text-gray-400                   →     text-t-secondary
text-green-400                  →     text-signal-green
text-red-400                    →     text-signal-red
```

## Testing

- Verify each theme renders correctly across all components
- Check glassmorphism blur renders in Chrome, Firefox, Safari
- Ensure light theme has sufficient contrast for readability
- Verify theme persistence across page reloads
- Confirm theme switching doesn't cause layout shifts
