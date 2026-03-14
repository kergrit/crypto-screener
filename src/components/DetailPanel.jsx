import SignalBadge from './SignalBadge'

function IndicatorCard({ label, children }) {
  return (
    <div className="glass-panel rounded-xl p-4 border">
      <div className="text-xs text-t-muted uppercase tracking-wider mb-2">{label}</div>
      {children}
    </div>
  )
}

function RSIGauge({ value }) {
  if (value === null || value === undefined) return <div className="text-t-muted">No data</div>

  let zone, zoneColor
  if (value < 30) { zone = 'OVERSOLD'; zoneColor = 'text-green-400' }
  else if (value < 45) { zone = 'LEANING BULLISH'; zoneColor = 'text-green-300' }
  else if (value > 70) { zone = 'OVERBOUGHT'; zoneColor = 'text-red-400' }
  else if (value > 55) { zone = 'LEANING BEARISH'; zoneColor = 'text-orange-300' }
  else { zone = 'NEUTRAL'; zoneColor = 'text-t-secondary' }

  return (
    <div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-t-primary font-mono">{value.toFixed(1)}</span>
        <span className={`text-sm font-medium ${zoneColor} mb-1`}>{zone}</span>
      </div>
      <div className="mt-2 h-2 bg-card-bg rounded-full overflow-hidden relative">
        {/* Zone colors */}
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-green-900/50" />
          <div className="w-[40%] bg-card-bg" />
          <div className="w-[30%] bg-red-900/50" />
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg transition-all duration-500"
          style={{ left: `${Math.min(100, Math.max(0, value))}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-t-muted">
        <span>0</span><span>30</span><span>50</span><span>70</span><span>100</span>
      </div>
    </div>
  )
}

function MACDDetail({ macd }) {
  if (!macd) return <div className="text-t-muted">No data</div>

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-t-muted">MACD</div>
          <div className={`text-sm font-mono ${macd.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {macd.macd.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-t-muted">Signal</div>
          <div className="text-sm font-mono text-t-secondary">{macd.signal.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[10px] text-t-muted">Histogram</div>
          <div className={`text-sm font-mono ${macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {macd.histogram.toFixed(4)}
          </div>
        </div>
      </div>
      <div className={`mt-2 text-xs text-center ${macd.bullish ? 'text-green-400' : 'text-red-400'}`}>
        {macd.bullish ? 'Bullish' : 'Bearish'} momentum
        {macd.crossUp && ' — Fresh bullish cross!'}
        {macd.crossDown && ' — Fresh bearish cross!'}
      </div>
    </div>
  )
}

function BBDetail({ bb }) {
  if (!bb) return <div className="text-t-muted">No data</div>

  let zone, zoneColor
  if (bb.percentB < 0.2) { zone = 'NEAR LOWER BAND'; zoneColor = 'text-green-400' }
  else if (bb.percentB > 0.8) { zone = 'NEAR UPPER BAND'; zoneColor = 'text-red-400' }
  else { zone = 'MID RANGE'; zoneColor = 'text-t-secondary' }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-t-muted">Upper</div>
          <div className="text-sm font-mono text-red-400/70">{bb.upper.toPrecision(6)}</div>
        </div>
        <div>
          <div className="text-[10px] text-t-muted">Middle</div>
          <div className="text-sm font-mono text-t-secondary">{bb.middle.toPrecision(6)}</div>
        </div>
        <div>
          <div className="text-[10px] text-t-muted">Lower</div>
          <div className="text-sm font-mono text-green-400/70">{bb.lower.toPrecision(6)}</div>
        </div>
      </div>
      <div className={`mt-2 text-xs text-center ${zoneColor}`}>
        %B: {(bb.percentB * 100).toFixed(1)}% — {zone}
      </div>
    </div>
  )
}

function EMADetail({ emaCross }) {
  if (!emaCross) return <div className="text-t-muted">No data</div>

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[10px] text-t-muted">EMA 9</div>
          <div className="text-sm font-mono text-blue-400">{emaCross.ema9.toPrecision(6)}</div>
        </div>
        <div>
          <div className="text-[10px] text-t-muted">EMA 21</div>
          <div className="text-sm font-mono text-purple-400">{emaCross.ema21.toPrecision(6)}</div>
        </div>
      </div>
      <div className={`mt-2 text-xs text-center ${emaCross.bullish ? 'text-green-400' : 'text-red-400'}`}>
        {emaCross.bullish ? 'Bullish trend (EMA9 > EMA21)' : 'Bearish trend (EMA9 < EMA21)'}
        {emaCross.crossUp && ' — Fresh golden cross!'}
        {emaCross.crossDown && ' — Fresh death cross!'}
      </div>
    </div>
  )
}

function VolumeDetail({ volChange }) {
  if (volChange === null || volChange === undefined) return <div className="text-t-muted">No data</div>

  let label, color
  if (volChange > 100) { label = 'VERY HIGH'; color = 'text-yellow-400' }
  else if (volChange > 50) { label = 'HIGH'; color = 'text-orange-300' }
  else if (volChange > 0) { label = 'ABOVE AVG'; color = 'text-green-300' }
  else { label = 'BELOW AVG'; color = 'text-t-secondary' }

  return (
    <div className="text-center">
      <div className="text-2xl font-bold font-mono text-t-primary">{volChange >= 0 ? '+' : ''}{volChange.toFixed(1)}%</div>
      <div className={`text-xs ${color}`}>{label} vs 20-period avg</div>
    </div>
  )
}

export default function DetailPanel({ coin }) {
  if (!coin) return null
  const ind = coin.indicators
  if (!ind) return (
    <div className="text-t-muted text-center py-8">Loading indicators for {coin.displayName}...</div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-t-primary">Technical Indicators</h3>
        <SignalBadge signal={ind.signal} color={ind.color} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IndicatorCard label="RSI (14)">
          <RSIGauge value={ind.rsi} />
        </IndicatorCard>

        <IndicatorCard label="MACD (12, 26, 9)">
          <MACDDetail macd={ind.macd} />
        </IndicatorCard>

        <IndicatorCard label="Bollinger Bands (20, 2)">
          <BBDetail bb={ind.bb} />
        </IndicatorCard>

        <IndicatorCard label="EMA Cross (9/21)">
          <EMADetail emaCross={ind.emaCross} />
        </IndicatorCard>

        <IndicatorCard label="Volume Change">
          <VolumeDetail volChange={ind.volChange} />
        </IndicatorCard>

        <IndicatorCard label="Composite Score">
          <div className="text-center">
            <div className={`text-3xl font-bold font-mono ${ind.color}`}>
              {ind.score >= 0 ? '+' : ''}{ind.score.toFixed(2)}
            </div>
            <div className="text-xs text-t-muted mt-1">
              Range: -1.0 (Strong Sell) to +1.0 (Strong Buy)
            </div>
          </div>
        </IndicatorCard>
      </div>
    </div>
  )
}
