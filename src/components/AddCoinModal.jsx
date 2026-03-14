import { useState } from 'react'

export default function AddCoinModal({ onClose, onAdd, existingSymbols, market = 'futures' }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (query) => {
    setSearch(query)
    if (query.length < 1) { setResults([]); return }

    setLoading(true)
    try {
      const baseUrl = market === 'futures' ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3'
      const res = await fetch(`${baseUrl}/exchangeInfo`)
      const data = await res.json()
      const matches = data.symbols
        .filter(s =>
          s.symbol.endsWith('USDT') &&
          s.status === 'TRADING' &&
          !existingSymbols.includes(s.symbol) &&
          (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
           s.baseAsset.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 10)
        .map(s => ({ symbol: s.symbol, base: s.baseAsset }))
      setResults(matches)
    } catch {
      setResults([])
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-modal-backdrop flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-modal-bg border border-modal-border glass-panel rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-t-primary mb-4">Add Coin to Watchlist</h3>
        <input
          type="text"
          placeholder="Search coin (e.g. BTC, SOL, DOGE)..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-card-bg border border-card-border rounded-lg px-4 py-2 text-t-primary placeholder-t-muted focus:outline-none focus:border-accent"
          autoFocus
        />

        <div className="mt-3 max-h-60 overflow-y-auto">
          {loading && <div className="text-t-muted text-center py-4">Searching...</div>}
          {!loading && results.length === 0 && search.length > 0 && (
            <div className="text-t-muted text-center py-4">No results found</div>
          )}
          {results.map(r => (
            <button
              key={r.symbol}
              onClick={() => { onAdd(r.symbol); onClose() }}
              className="w-full text-left px-4 py-2 hover:bg-card-hover rounded-lg flex items-center justify-between"
            >
              <span className="font-semibold text-t-primary">{r.base}<span className="text-t-muted text-sm">/USDT</span></span>
              <span className="text-xs text-t-muted">{r.symbol}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-card-bg text-t-secondary py-2 rounded-lg hover:bg-card-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
