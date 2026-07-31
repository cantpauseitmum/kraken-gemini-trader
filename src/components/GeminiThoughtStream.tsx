import React from 'react';
import { ThoughtLog } from '../types';
import { Brain, CheckCircle2, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

interface GeminiThoughtStreamProps {
  thoughts: ThoughtLog[];
  isAnalyzing: boolean;
}

export const GeminiThoughtStream: React.FC<GeminiThoughtStreamProps> = ({ thoughts, isAnalyzing }) => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-sm text-white">Gemini Pro Reasoning Stream</h2>
        </div>
        <span className="text-xs text-gray-400 font-mono">Model: gemini-1.5-pro</span>
      </div>

      {isAnalyzing && (
        <div className="p-4 mb-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3 animate-pulse">
          <Brain className="w-5 h-5 text-blue-400 animate-spin" />
          <div className="text-xs text-blue-200">
            Evaluating Kraken orderbook, RSI momentum, and technical indicators...
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {thoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <Brain className="w-8 h-8 mb-2 stroke-1 opacity-50" />
            <p className="text-xs">No AI analyses recorded yet.</p>
            <p className="text-[11px] mt-1 text-gray-600">Click "Ask Gemini Pro" to evaluate current market conditions.</p>
          </div>
        ) : (
          thoughts.map((log) => {
            const isBuy = log.action === 'BUY';
            const isSell = log.action === 'SELL';
            const isHold = log.action === 'HOLD';

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
                    <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700">
                      RSI: {log.technicalIndicators.rsi14 || 'N/A'}
                    </span>
                    <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700">
                      SMA20: ${log.technicalIndicators.sma20 || 'N/A'}
                    </span>
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
