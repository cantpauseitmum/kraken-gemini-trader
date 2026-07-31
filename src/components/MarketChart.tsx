import React, { useState } from 'react';
import { OHLCV, KrakenTicker, TradePosition } from '../types';
import { TrendingUp, TrendingDown, Layers, BarChart2 } from 'lucide-react';

interface MarketChartProps {
  candles: OHLCV[];
  ticker: KrakenTicker | null;
  positions: TradePosition[];
  activePair: string;
  onSelectPair: (pair: string) => void;
  selectedTimeframe: number;
  onSelectTimeframe: (tf: number) => void;
}

export const MarketChart: React.FC<MarketChartProps> = ({
  candles,
  ticker,
  positions,
  activePair,
  onSelectPair,
  selectedTimeframe,
  onSelectTimeframe,
}) => {
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center h-96 text-gray-400">
        <BarChart2 className="w-10 h-10 animate-bounce text-blue-500 mb-3" />
        <p className="text-sm font-medium">Fetching Kraken Market Data...</p>
      </div>
    );
  }

  // Slice recent N candles appropriate for timeframe so chart is readable and current
  const maxCandleCount = selectedTimeframe === 1440 ? 60 : selectedTimeframe === 240 ? 80 : 90;
  const displayCandles = candles.slice(-maxCandleCount);

  const minPrice = Math.min(...displayCandles.map((c) => c.low)) * 0.998;
  const maxPrice = Math.max(...displayCandles.map((c) => c.high)) * 1.002;
  const rangePrice = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...displayCandles.map((c) => c.volume)) || 1;

  const width = 800;
  const height = 360;
  const candleWidth = Math.max(3, (width / displayCandles.length) * 0.7);

  const getX = (index: number) => (index / (displayCandles.length - 1 || 1)) * (width - 60) + 20;
  const getY = (val: number) => height - 50 - ((val - minPrice) / rangePrice) * (height - 80);

  // Compute SMA 20 points
  const sma20Points: { x: number; y: number }[] = [];
  for (let i = 19; i < displayCandles.length; i++) {
    const slice = displayCandles.slice(i - 19, i + 1);
    const avg = slice.reduce((a, b) => a + b.close, 0) / 20;
    sma20Points.push({ x: getX(i), y: getY(avg) });
  }
  const sma20Path = sma20Points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const currentPrice = ticker ? ticker.last : displayCandles[displayCandles.length - 1].close;
  const currentY = getY(currentPrice);
  const isUp = ticker ? ticker.last >= ticker.open24h : displayCandles[displayCandles.length - 1].close >= displayCandles[0].close;

  // Active hover candle info
  const activeCandle = hoverIndex !== null ? displayCandles[hoverIndex] : displayCandles[displayCandles.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    displayCandles.forEach((_, idx) => {
      const cx = getX(idx);
      const diff = Math.abs(cx - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  // Timeframe-specific date/time label formatter
  const formatXAxisLabel = (timestampSec: number) => {
    const d = new Date(timestampSec * 1000);
    if (selectedTimeframe === 1440) {
      // 1 Day: Month & Day (e.g. Jun 15, Jul 01)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    if (selectedTimeframe === 240) {
      // 4 Hours: Month, Day & Hour (e.g. Jul 28 16:00)
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    // 15M / 1H: Time (e.g. 14:30)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatHoverDate = (timestampSec: number) => {
    const d = new Date(timestampSec * 1000);
    if (selectedTimeframe === 1440) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
      {/* Chart Controls & Ticker Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          {/* Pair Switcher */}
          <select
            value={activePair}
            onChange={(e) => onSelectPair(e.target.value)}
            className="bg-gray-900 text-white font-bold text-base px-3 py-1.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="XBTUSD">BTC / USD (XBTUSD)</option>
            <option value="ETHUSD">ETH / USD (ETHUSD)</option>
            <option value="SOLUSD">SOL / USD (SOLUSD)</option>
          </select>

          {/* Price Metrics */}
          {ticker && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-400 block text-[10px]">LAST PRICE</span>
                <span className={`text-base font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${ticker.last.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">24H CHANGE</span>
                <span className={`font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(((ticker.last - ticker.open24h) / ticker.open24h) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-gray-400 block text-[10px]">24H HIGH / LOW</span>
                <span className="text-gray-300">
                  ${ticker.high24h.toLocaleString()} / ${ticker.low24h.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timeframe & Display Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
            {[15, 60, 240, 1440].map((tf) => (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedTimeframe === tf ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf === 1440 ? '1D' : tf === 240 ? '4H' : tf === 60 ? '1H' : '15M'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setChartType(chartType === 'candle' ? 'line' : 'candle')}
            className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            title="Toggle Chart Type"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover Info Banner */}
      {activeCandle && (
        <div className="flex flex-wrap items-center gap-4 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-gray-800 font-mono text-[11px] text-gray-300">
          <span className="text-blue-400 font-bold">
            {formatHoverDate(activeCandle.time)}
          </span>
          <span>O: <strong className="text-white">${activeCandle.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400">${activeCandle.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400">${activeCandle.low.toFixed(2)}</strong></span>
          <span>C: <strong className="text-white">${activeCandle.close.toFixed(2)}</strong></span>
          <span>Vol: <strong className="text-blue-300">{activeCandle.volume.toFixed(2)}</strong></span>
        </div>
      )}

      {/* SVG Canvas Chart */}
      <div className="relative w-full h-[320px] bg-slate-950/60 rounded-xl overflow-hidden p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Price Horizontal Grid lines */}
          {[0.25, 0.5, 0.75].map((factor, i) => {
            const y = height - 50 - factor * (height - 80);
            const priceVal = minPrice + factor * rangePrice;
            return (
              <g key={i}>
                <line x1="20" y1={y} x2={width - 45} y2={y} stroke="#1f2937" strokeDasharray="4 4" strokeWidth="1" />
                <text x={width - 40} y={y + 3} fill="#6b7280" fontSize="10" fontFamily="Fira Code" textAnchor="start">
                  ${priceVal > 100 ? priceVal.toFixed(0) : priceVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Time Vertical Grid Lines & Labels */}
          {[0.15, 0.38, 0.62, 0.85].map((factor, i) => {
            const idx = Math.floor(factor * (displayCandles.length - 1));
            if (!displayCandles[idx]) return null;
            const x = getX(idx);
            const timeStr = formatXAxisLabel(displayCandles[idx].time);
            return (
              <g key={`t_${i}`}>
                <line x1={x} y1="20" x2={x} y2={height - 30} stroke="#1f2937" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={x} y={height - 10} fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="Fira Code" textAnchor="middle">
                  {timeStr}
                </text>
              </g>
            );
          })}

          {/* Volume Bars */}
          {displayCandles.map((c, i) => {
            const x = getX(i);
            const volHeight = (c.volume / maxVolume) * 35;
            const y = height - 25 - volHeight;
            const isBullish = c.close >= c.open;
            return (
              <rect
                key={`vol_${i}`}
                x={x - candleWidth / 2}
                y={y}
                width={candleWidth}
                height={volHeight}
                fill={isBullish ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
              />
            );
          })}

          {/* Candlesticks or Area Line */}
          {chartType === 'candle' ? (
            displayCandles.map((c, i) => {
              const x = getX(i);
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);
              const isBullish = c.close >= c.open;
              const topY = Math.min(openY, closeY);
              const candleH = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={`c_${i}`}>
                  {/* High-Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={isBullish ? '#22c55e' : '#ef4444'}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={topY}
                    width={candleWidth}
                    height={candleH}
                    fill={isBullish ? '#22c55e' : '#ef4444'}
                    rx="1"
                  />
                </g>
              );
            })
          ) : (
            <path
              d={
                displayCandles
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.close)}`)
                  .join(' ') + ` L ${getX(displayCandles.length - 1)} ${height - 50} L ${getX(0)} ${height - 50} Z`
              }
              fill="url(#lineGrad)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}

          {/* SMA 20 Overlay Line */}
          {sma20Path && <path d={sma20Path} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />}

          {/* Live Price Dashed Line */}
          <line x1="20" y1={currentY} x2={width - 50} y2={currentY} stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="1.2" />
          <rect x={width - 48} y={currentY - 9} width="46" height="18" rx="4" fill="#0284c7" />
          <text x={width - 25} y={currentY + 3} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="Fira Code" textAnchor="middle">
            ${currentPrice > 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}
          </text>

          {/* Hover Crosshair */}
          {hoverIndex !== null && displayCandles[hoverIndex] && (
            <g>
              <line x1={getX(hoverIndex)} y1="20" x2={getX(hoverIndex)} y2={height - 30} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="20" y1={getY(displayCandles[hoverIndex].close)} x2={width - 50} y2={getY(displayCandles[hoverIndex].close)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx={getX(hoverIndex)} cy={getY(displayCandles[hoverIndex].close)} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Trade Markers */}
          {positions.map((pos) => {
            if (pos.pair !== activePair) return null;
            const candleIdx = displayCandles.findIndex(
              (c) => Math.abs(c.time * 1000 - new Date(pos.timestamp).getTime()) < selectedTimeframe * 60000 * 3
            );
            if (candleIdx === -1) return null;
            const x = getX(candleIdx);
            const y = getY(pos.entryPrice);
            const isBuy = pos.side === 'BUY';

            return (
              <g key={`marker_${pos.id}`}>
                <circle cx={x} cy={y} r="6" fill={isBuy ? '#22c55e' : '#ef4444'} stroke="#ffffff" strokeWidth="1.5" />
                <text x={x} y={isBuy ? y - 10 : y + 15} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {isBuy ? 'BUY' : 'SELL'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
