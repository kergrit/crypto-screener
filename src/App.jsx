import { useState } from 'react'
import { TIMEFRAMES, MARKET_TYPES } from './lib/binance'
import { useCryptoData } from './hooks/useCryptoData'
import CoinRow from './components/CoinRow'
import DetailPanel from './components/DetailPanel'
import StrategyPanel from './components/StrategyPanel'
import BacktestDashboard from './components/BacktestDashboard'
import AddCoinModal from './components/AddCoinModal'
import { THEMES, getInitialTheme, setTheme } from './lib/themes'

const SIGNAL_FILTERS = [
  { label: 'ALL', value: null, color: 'text-t-primary' },
  { label: 'STRONG BUY', value: 'STRONG BUY', color: 'text-emerald-400' },
  { label: 'BUY', value: 'BUY', color: 'text-green-400' },
  { label: 'NEUTRAL', value: 'NEUTRAL', color: 'text-t-secondary' },
  { label: 'SELL', value: 'SELL', color: 'text-orange-400' },
  { label: 'STRONG SELL', value: 'STRONG SELL', color: 'text-red-400' },
]

function MarketSummary({ coins }) {
  const btc = coins.find(c => c.symbol === 'BTCUSDT')
  const totalVol = coins.reduce((sum, c) => sum + (c.volume24h || 0), 0)
  const gainers = coins.filter(c => c.priceChange24h > 0).length
  const losers = coins.filter(c => c.priceChange24h < 0).length

  const strongBuys = coins.filter(c => c.indicators?.signal === 'STRONG BUY').length
  const buys = coins.filter(c => c.indicators?.signal === 'BUY').length
  const sells = coins.filter(c => c.indicators?.signal === 'SELL' || c.indicators?.signal === 'STRONG SELL').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">BTC Price</div>
        <div className="text-lg font-bold text-t-primary font-mono">
          ${btc?.price?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '---'}
        </div>
        <div className={`text-xs ${btc?.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {btc?.priceChange24h >= 0 ? '+' : ''}{btc?.priceChange24h?.toFixed(2) || '0'}%
        </div>
      </div>

      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">24h Volume</div>
        <div className="text-lg font-bold text-t-primary font-mono">
          ${totalVol >= 1e9 ? (totalVol / 1e9).toFixed(1) + 'B' : (totalVol / 1e6).toFixed(0) + 'M'}
        </div>
        <div className="text-xs text-t-muted">Top {coins.length} coins</div>
      </div>

      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">Market Mood</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold text-green-400">{gainers}</span>
          <span className="text-t-muted text-sm">/</span>
          <span className="text-lg font-bold text-red-400">{losers}</span>
        </div>
        <div className="text-xs text-t-muted">Gainers / Losers</div>
      </div>

      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">Buy Signals</div>
        <div className="text-lg font-bold text-emerald-400">{strongBuys + buys}</div>
        <div className="text-xs text-t-muted">{strongBuys} strong, {buys} normal</div>
      </div>

      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">Sell Signals</div>
        <div className="text-lg font-bold text-red-400">{sells}</div>
        <div className="text-xs text-t-muted">coins showing sell</div>
      </div>

      <div className="glass-panel bg-glass-bg rounded-xl p-3 border border-glass-border">
        <div className="text-[10px] text-t-muted uppercase tracking-wider">Tracking</div>
        <div className="text-lg font-bold text-t-primary">{coins.length}</div>
        <div className="text-xs text-t-muted">coins total</div>
      </div>
    </div>
  )
}

export default function App() {
  const [timeframe, setTimeframe] = useState('1h')
  const [selectedCoin, setSelectedCoin] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [signalFilter, setSignalFilter] = useState(null)
  const [showBacktest, setShowBacktest] = useState(false)
  const [detailTab, setDetailTab] = useState('indicators') // 'indicators' | 'strategy' | 'backtest'
  const [market, setMarket] = useState('futures') // 'futures' | 'spot'

  const [theme, setThemeState] = useState(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    return initial
  })
  const handleThemeChange = (key) => {
    setThemeState(key)
    setTheme(key)
  }

  const { coins, loading, error, pinnedSymbols, togglePin } = useCryptoData(timeframe, market)

  // Filter coins by signal
  const filteredCoins = signalFilter
    ? coins.filter(c => c.indicators?.signal === signalFilter)
    : coins

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin)

  return (
    <div className="min-h-screen bg-page text-t-primary transition-colors duration-500" style={{ backgroundImage: 'var(--bg-page-gradient)' }}>
      {/* Header */}
      <div className="border-b border-glass-border bg-header backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-t-primary tracking-tight">
              <span className="text-blue-400">Crypto</span> Screener
            </h1>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
              LIVE
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              market === 'futures'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {market === 'futures' ? 'FUTURES' : 'SPOT'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Market type toggle */}
            <div className="flex items-center gap-1 bg-glass-bg rounded-lg p-1">
              {MARKET_TYPES.map(mt => (
                <button
                  key={mt.value}
                  onClick={() => setMarket(mt.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    market === mt.value
                      ? mt.value === 'futures'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'text-t-secondary hover:text-t-primary hover:bg-card-hover'
                  }`}
                >
                  {mt.label}
                </button>
              ))}
            </div>

            {/* Theme switcher */}
            <div className="flex items-center gap-1.5 glass-panel rounded-xl p-1.5 border border-glass-border">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleThemeChange(t.key)}
                  title={t.label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    theme === t.key
                      ? 'ring-2 ring-offset-1 ring-offset-transparent scale-110'
                      : 'hover:bg-card-hover opacity-50 hover:opacity-100 hover:scale-105'
                  }`}
                  style={theme === t.key ? { '--tw-ring-color': t.dot } : {}}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/30 shadow-lg"
                    style={{
                      backgroundColor: t.dot,
                      boxShadow: theme === t.key ? `0 0 10px ${t.dot}80, 0 0 20px ${t.dot}40` : `0 2px 4px rgba(0,0,0,0.3)`,
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-glass-bg rounded-lg p-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    timeframe === tf.value
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'text-t-secondary hover:text-t-primary hover:bg-card-hover'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4">
            Error: {error}. Retrying...
          </div>
        )}

        {/* Market Summary */}
        <MarketSummary coins={coins} />

        {/* Signal Filter Bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-t-muted uppercase tracking-wider mr-1">Filter:</span>
          {SIGNAL_FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => setSignalFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                signalFilter === f.value
                  ? `${f.color} border-current bg-white/10 scale-105`
                  : 'text-t-muted border-card-border hover:text-t-secondary hover:border-glass-border'
              }`}
            >
              {f.label}
              {f.value && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {coins.filter(c => c.indicators?.signal === f.value).length}
                </span>
              )}
            </button>
          ))}
          {signalFilter && (
            <span className="text-xs text-t-muted ml-2">
              Showing {filteredCoins.length} of {coins.length} coins
            </span>
          )}
        </div>

        {/* Screener Table */}
        <div className="glass-panel bg-card-bg border border-card-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-t-muted">
                  <th className="px-3 py-3 text-left w-10"></th>
                  <th className="px-3 py-3 text-left">Coin</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">24h %</th>
                  <th className="px-3 py-3 text-center">Chart</th>
                  <th className="px-3 py-3 text-right">Volume</th>
                  <th className="px-3 py-3 text-left">RSI (14)</th>
                  <th className="px-3 py-3 text-center">EMA 9/21</th>
                  <th className="px-3 py-3 text-center">MACD</th>
                  <th className="px-3 py-3 text-center">Signal</th>
                </tr>
              </thead>
              <tbody>
                {loading && coins.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-t-muted">Loading market data from Binance...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCoins.map(coin => (
                    <CoinRow
                      key={coin.symbol}
                      coin={coin}
                      isPinned={pinnedSymbols.includes(coin.symbol)}
                      onTogglePin={togglePin}
                      onSelect={setSelectedCoin}
                      isSelected={selectedCoin === coin.symbol}
                      onSignalClick={setSignalFilter}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add coin button */}
          <div className="border-t border-card-border p-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm text-t-muted hover:text-blue-400 hover:bg-glass-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Coin
            </button>
          </div>
        </div>

        {/* Detail Fullscreen Modal */}
        {selectedCoinData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop backdrop-blur-md" onClick={() => setSelectedCoin(null)}>
            <div
              className="glass-panel bg-modal-bg border border-modal-border rounded-3xl w-[95vw] max-w-[1400px] max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-card-border shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-t-primary">
                    {selectedCoinData.displayName}
                    <span className="text-t-muted font-normal">/USDT</span>
                    <span className="ml-3 text-sm font-normal font-mono text-t-secondary">
                      ${selectedCoinData.price?.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                    </span>
                    <span className={`ml-2 text-sm font-normal ${selectedCoinData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCoinData.priceChange24h >= 0 ? '+' : ''}{selectedCoinData.priceChange24h?.toFixed(2)}%
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {/* Tab bar */}
                  <div className="flex gap-1 bg-glass-bg rounded-lg p-1">
                    {[
                      { key: 'indicators', label: '📈 Indicators' },
                      { key: 'strategy', label: '🎯 Strategies' },
                      { key: 'backtest', label: '🧪 Backtest' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setDetailTab(tab.key)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          detailTab === tab.key
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-t-secondary hover:text-t-primary hover:bg-card-hover'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedCoin(null)}
                    className="text-t-secondary hover:text-t-primary hover:bg-card-hover transition-all rounded-lg w-8 h-8 flex items-center justify-center text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal body — scrollable */}
              <div className="overflow-y-auto flex-1 p-6">
                {detailTab === 'indicators' && <DetailPanel coin={selectedCoinData} />}
                {detailTab === 'strategy' && <StrategyPanel coin={selectedCoinData} timeframe={timeframe} market={market} />}
                {detailTab === 'backtest' && (
                  <BacktestDashboard
                    coin={selectedCoinData}
                    onClose={() => setDetailTab('indicators')}
                    market={market}
                  />
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-2 border-t border-card-border text-center text-[10px] text-t-muted shrink-0">
                Press ESC or click outside to close
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backtest fullscreen modal rendered at root level for proper z-index */}
      {/* Add Coin Modal */}
      {showAddModal && (
        <AddCoinModal
          onClose={() => setShowAddModal(false)}
          onAdd={(symbol) => togglePin(symbol)}
          existingSymbols={coins.map(c => c.symbol)}
          market={market}
        />
      )}
    </div>
  )
}
