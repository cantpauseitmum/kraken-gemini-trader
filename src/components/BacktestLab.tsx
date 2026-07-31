import React, { useState } from 'react';
import { BacktestResult } from '../types';
import { Play, TrendingUp, ShieldAlert, Award, Clock, ArrowUpRight, BarChart2 } from 'lucide-react';

interface BacktestLabProps {
  onRunBacktest: (params: {
    pair: string;
    timeframeIntervalMinutes: number;
    initialBalance: number;
    useAiEvaluations: boolean;
  }) => Promise<BacktestResult>;
  backtestHistory: BacktestResult[];
}

export const BacktestLab: React.FC<BacktestLabProps> = ({ onRunBacktest, backtestHistory }) => {
  const [pair, setPair] = useState('XBTUSD');
  const [timeframe, setTimeframe] = useState(60);
  const [initialBalance, setInitialBalance] = useState(10000);
  const [useAi, setUseAi] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeResult, setActiveResult] = useState<BacktestResult | null>(
    backtestHistory.length > 0 ? backtestHistory[0] : null
  );

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await onRunBacktest({
        pair,
        timeframeIntervalMinutes: timeframe,
        initialBalance,
        useAiEvaluations: useAi,
      });
      setActiveResult(res);
    } catch (e: any) {
      alert(`Backtest Error: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Config & Controls Card */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              Historical Backtesting Lab
            </h2>
            <p className="text-xs text-gray-400">
              Evaluate Gemini Pro trading strategies against historical Kraken OHLCV candle data
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Backtest...' : 'Execute Backtest'}
          </button>
        </div>

        {/* Parameter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Pair */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Asset Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full bg-gray-900 text-white text-sm px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="XBTUSD">Bitcoin (BTC / USD)</option>
              <option value="ETHUSD">Ethereum (ETH / USD)</option>
              <option value="SOLUSD">Solana (SOL / USD)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Candle Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(parseInt(e.target.value, 10))}
              className="w-full bg-gray-900 text-white text-sm px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value={15}>15 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={240}>4 Hours</option>
              <option value={1440}>1 Day</option>
            </select>
          </div>

          {/* Initial Balance */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Starting Balance ($ USD)</label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 1000)}
              className="w-full bg-gray-900 text-white text-sm px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* AI Mode Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Evaluation Model</label>
            <div className="flex items-center gap-2 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs text-gray-300">
                {useAi ? 'Gemini Pro AI Signals' : 'Fast Quantitative Signals'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Backtest Results View */}
      {activeResult && (
        <div className="space-y-6">
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block font-medium">TOTAL RETURN</span>
              <div className={`text-xl font-bold font-mono mt-1 ${activeResult.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeResult.totalReturnPercent >= 0 ? '+' : ''}{activeResult.totalReturnPercent}%
              </div>
              <span className="text-[10px] text-gray-500">
                ${activeResult.initialBalance} ➔ ${activeResult.finalBalance}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block font-medium">WIN RATE</span>
              <div className="text-xl font-bold font-mono mt-1 text-blue-400">
                {activeResult.winRatePercent}%
              </div>
              <span className="text-[10px] text-gray-500">
                {activeResult.winningTrades} W / {activeResult.losingTrades} L ({activeResult.totalTrades} Total)
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block font-medium">MAX DRAWDOWN</span>
              <div className="text-xl font-bold font-mono mt-1 text-rose-400">
                -{activeResult.maxDrawdownPercent}%
              </div>
              <span className="text-[10px] text-gray-500">Peak-to-trough risk</span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block font-medium">SHARPE RATIO</span>
              <div className="text-xl font-bold font-mono mt-1 text-indigo-400">
                {activeResult.sharpeRatio}
              </div>
              <span className="text-[10px] text-gray-500">Risk-adjusted metric</span>
            </div>
          </div>

          {/* Equity Curve Visualizer */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Equity Curve Over Time</h3>
            <div className="h-48 w-full bg-slate-950/60 rounded-xl p-3">
              <svg viewBox="0 0 600 120" className="w-full h-full">
                {/* Draw line */}
                {(() => {
                  const curve = activeResult.equityCurve;
                  if (!curve || curve.length === 0) return null;
                  const balances = curve.map((c) => c.balance);
                  const min = Math.min(...balances);
                  const max = Math.max(...balances);
                  const range = max - min || 1;

                  const points = curve.map((c, i) => {
                    const x = (i / (curve.length - 1)) * 580 + 10;
                    const y = 110 - ((c.balance - min) / range) * 90;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  return (
                    <g>
                      <path d={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Trade Log Table */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Simulated Trades Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/60 text-gray-400 uppercase text-[10px] font-mono border-b border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Entry Price</th>
                    <th className="py-2.5 px-3">Exit Price</th>
                    <th className="py-2.5 px-3">PnL ($)</th>
                    <th className="py-2.5 px-3">PnL (%)</th>
                    <th className="py-2.5 px-3">Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {activeResult.trades.map((t) => {
                    const isWin = (t.pnlUSD || 0) >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-gray-400">{t.timestamp.split('T')[0]}</td>
                        <td className="py-2 px-3 font-bold text-emerald-400">{t.side}</td>
                        <td className="py-2 px-3">${t.entryPrice.toLocaleString()}</td>
                        <td className="py-2 px-3">${t.closePrice?.toLocaleString() || '-'}</td>
                        <td className={`py-2 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.pnlUSD?.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}{t.pnlPercent?.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-gray-400 font-sans max-w-xs truncate">{t.geminiReasoning || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
