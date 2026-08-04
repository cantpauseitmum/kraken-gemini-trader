import React, { useState } from 'react';
import { Radar, Sparkles, TrendingUp, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw, BarChart2 } from 'lucide-react';
import { AppSettings } from '../types';

interface ScanResult {
  pair: string;
  ticker: {
    last: number;
    high24h: number;
    low24h: number;
  };
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    rationale: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  indicators: Record<string, any>;
}

interface PortfolioScannerProps {
  settings: AppSettings;
  onSelectPair: (pair: string) => void;
}

export const PortfolioScanner: React.FC<PortfolioScannerProps> = ({ settings, onSelectPair }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const monitoredPairs = settings.monitoredPairs || ['SOLUSD', 'XBTUSD', 'ETHUSD'];

  const handleRunScan = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/scan-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: monitoredPairs }),
      });
      const data = await res.json();
      if (data.results) {
        setScanResults(data.results);
        setLastScanTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setErrorMessage(data.error || 'Failed to fetch scan results.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error scanning portfolio.');
    } finally {
      setIsScanning(false);
    }
  };

  const topChoice = scanResults.length > 0 ? scanResults[0] : null;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
      {/* Scanner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radar className={`w-6 h-6 ${isScanning ? 'text-cyan-400 animate-spin' : 'text-cyan-400'}`} />
            <h2 className="font-bold text-lg text-white">Multi-Pair Portfolio Scanner</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              AI Market Radar
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Scans <span className="font-mono text-cyan-300 font-bold">{monitoredPairs.join(', ')}</span> in parallel to rank trade opportunities by AI confidence.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Radar className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning Markets...' : 'Run Portfolio Scan'}
        </button>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Top Opportunity Highlight Card */}
      {topChoice && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 border border-blue-500/40 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Top Rated Market Signal
              </span>
            </div>
            {lastScanTime && (
              <span className="text-[10px] font-mono text-gray-400">Scanned @ {lastScanTime}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white font-mono">{topChoice.pair}</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                topChoice.decision.action === 'BUY' ? 'badge-buy' : topChoice.decision.action === 'SELL' ? 'badge-sell' : 'badge-hold'
              }`}>
                {topChoice.decision.action}
              </span>
              <span className="text-sm font-mono text-gray-300">@ ${topChoice.ticker.last.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">AI CONFIDENCE</span>
                <span className="font-mono font-bold text-sm text-blue-400">{topChoice.decision.confidence}%</span>
              </div>
              <button
                onClick={() => onSelectPair(topChoice.pair)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all cursor-pointer"
              >
                Switch Chart to {topChoice.pair}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-sans pt-2 border-t border-gray-800/80">
            {topChoice.decision.rationale}
          </p>
        </div>
      )}

      {/* Scanned Markets Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scanned Assets Overview</h3>

        {scanResults.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-gray-800 text-center space-y-2">
            <BarChart2 className="w-8 h-8 text-cyan-400 mx-auto opacity-50" />
            <p className="text-xs text-gray-400">No active scan results yet.</p>
            <p className="text-[11px] text-gray-500">Click "Run Portfolio Scan" to evaluate all monitored pairs simultaneously.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scanResults.map((item) => {
              const isBuy = item.decision.action === 'BUY';
              const isSell = item.decision.action === 'SELL';
              const badgeClass = isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-hold';

              return (
                <div
                  key={item.pair}
                  className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 hover:border-gray-700 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-white">{item.pair}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                      {item.decision.action}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-bold text-white">${item.ticker.last.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Confidence</span>
                      <span className="font-mono font-bold text-blue-400">{item.decision.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.decision.confidence > 70 ? 'bg-emerald-400' : item.decision.confidence > 50 ? 'bg-blue-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${item.decision.confidence}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {item.decision.rationale}
                  </p>

                  <button
                    onClick={() => onSelectPair(item.pair)}
                    className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    View {item.pair} Chart
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
