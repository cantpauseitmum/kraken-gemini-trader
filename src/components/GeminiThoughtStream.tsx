import React, { useState } from 'react';
import { ThoughtLog } from '../types';
import { Brain, CheckCircle2, Clock, ShieldAlert, AlertTriangle, AlertCircle, Terminal, Filter } from 'lucide-react';

interface GeminiThoughtStreamProps {
  thoughts: ThoughtLog[];
  isAnalyzing: boolean;
}

export const GeminiThoughtStream: React.FC<GeminiThoughtStreamProps> = ({ thoughts, isAnalyzing }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'SIGNALS' | 'ERRORS'>('ALL');

  const filteredThoughts = thoughts.filter((log) => {
    if (filterType === 'SIGNALS') {
      return log.action === 'BUY' || log.action === 'SELL' || log.action === 'HOLD';
    }
    if (filterType === 'ERRORS') {
      return log.action === 'ERROR' || log.logType === 'ERROR' || log.errorDetails;
    }
    return true;
  });

  const errorCount = thoughts.filter(l => l.action === 'ERROR' || l.logType === 'ERROR' || l.errorDetails).length;

  return (
    <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col h-[520px]">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-sm text-white">AI Stream & Diagnostics</h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-gray-800 text-[11px] font-medium">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterType === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({thoughts.length})
          </button>
          <button
            onClick={() => setFilterType('SIGNALS')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterType === 'SIGNALS' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Signals
          </button>
          <button
            onClick={() => setFilterType('ERRORS')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              filterType === 'ERRORS' ? 'bg-rose-600 text-white font-bold' : 'text-gray-400 hover:text-rose-400'
            }`}
          >
            {errorCount > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
            Errors ({errorCount})
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="p-3 mb-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3 animate-pulse">
          <Brain className="w-4 h-4 text-blue-400 animate-spin" />
          <div className="text-xs text-blue-200">
            Evaluating Kraken orderbook, RSI momentum, and technical indicators...
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredThoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <Terminal className="w-8 h-8 mb-2 stroke-1 opacity-50" />
            <p className="text-xs">No entries found for selected filter.</p>
            <p className="text-[11px] mt-1 text-gray-600">AI analysis & system diagnostic events will stream here.</p>
          </div>
        ) : (
          filteredThoughts.map((log) => {
            const isError = log.action === 'ERROR' || log.logType === 'ERROR' || !!log.errorDetails;
            const isBuy = log.action === 'BUY';
            const isSell = log.action === 'SELL';

            // ERROR LOG CARD
            if (isError) {
              const provider = log.errorDetails?.provider || 'SYSTEM';
              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2.5 shadow-md shadow-rose-950/20"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                        {provider} ERROR
                      </span>
                      {log.pair && <span className="font-mono font-semibold text-gray-300">{log.pair}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-rose-400" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>

                  {/* Raw Error Message */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-rose-500/20 font-mono text-[11px] text-rose-200 break-words break-all">
                    {log.errorDetails?.rawMessage || log.reasoning}
                  </div>

                  {/* Actionable Suggestion */}
                  {log.errorDetails?.suggestion && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{log.errorDetails.suggestion}</span>
                    </div>
                  )}
                </div>
              );
            }

            // SYSTEM / INFO LOG CARD
            if (log.action === 'INFO' || log.logType === 'SYSTEM') {
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs space-x-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                      SYSTEM EVENT
                    </span>
                    <span className="text-gray-200 font-medium">{log.reasoning}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 font-mono text-[10px] shrink-0">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            }

            // STANDARD AI SIGNAL LOG CARD
            const badgeClass = isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-hold';

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 hover:border-gray-700 transition-all space-y-3"
              >
                {/* Header info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badgeClass}`}>
                      {log.action}
                    </span>
                    <span className="font-mono font-semibold text-white">{log.pair}</span>
                    <span className="text-gray-400">@ ${log.price ? log.price.toLocaleString() : 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Rationale Text */}
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{log.reasoning}</p>

                {/* Confidence Bar & Indicators */}
                <div className="space-y-1.5 pt-1 border-t border-gray-800/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      AI Confidence
                    </span>
                    <span className="font-mono font-bold text-blue-400">{log.confidence}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        log.confidence > 70 ? 'bg-emerald-400' : log.confidence > 50 ? 'bg-blue-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${log.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Technical factors tags */}
                {log.technicalIndicators && (
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono text-gray-400">
                    {log.technicalIndicators.rsi14 && (
                      <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700">
                        RSI: {log.technicalIndicators.rsi14}
                      </span>
                    )}
                    {log.technicalIndicators.sma20 && (
                      <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700">
                        SMA20: ${log.technicalIndicators.sma20}
                      </span>
                    )}
                    {log.riskLevel && (
                      <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700 text-amber-300">
                        Risk: {log.riskLevel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
