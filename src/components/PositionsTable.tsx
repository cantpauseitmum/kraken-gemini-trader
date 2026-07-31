import React from 'react';
import { TradePosition } from '../types';
import { DollarSign, XCircle, TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react';

interface PositionsTableProps {
  positions: TradePosition[];
  onClosePosition: (id: string, pair: string) => void;
  paperBalance: number;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, onClosePosition, paperBalance }) => {
  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  const totalRealizedPnL = closedPositions.reduce((acc, p) => acc + (p.pnlUSD || 0), 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">VIRTUAL PAPER BALANCE</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            ${paperBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
          </div>
          <span className="text-[10px] text-gray-500">Available capital for Paper Trading</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">OPEN POSITIONS COUNT</span>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {openPositions.length} Positions
          </div>
          <span className="text-[10px] text-gray-500">Currently active trades</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">TOTAL REALIZED PNL</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)} USD
          </div>
          <span className="text-[10px] text-gray-500">Closed trade net return</span>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Active Open Positions
          </h3>
          <span className="text-xs text-gray-400 font-mono">{openPositions.length} Active</span>
        </div>

        {openPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs font-mono border border-dashed border-gray-800 rounded-xl">
            No open positions currently active.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900/60 text-gray-400 uppercase text-[10px] font-mono border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Pair</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Value ($)</th>
                  <th className="py-2.5 px-3">Stop Loss</th>
                  <th className="py-2.5 px-3">Take Profit</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {openPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-800/30">
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.type === 'REAL' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{pos.pair}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{pos.side}</td>
                    <td className="py-2.5 px-3">${pos.entryPrice.toLocaleString()}</td>
                    <td className="py-2.5 px-3">{pos.amount.toFixed(6)}</td>
                    <td className="py-2.5 px-3">${pos.valueUSD.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-rose-400">${pos.stopLoss.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-emerald-400">${pos.takeProfit.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onClosePosition(pos.id, pos.pair)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-sans font-semibold text-[11px]"
                      >
                        Close Position
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Positions History */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Trade Execution History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-[10px] font-mono border-b border-gray-800">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Pair</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Close Price</th>
                <th className="py-2.5 px-3">PnL ($)</th>
                <th className="py-2.5 px-3">PnL (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {closedPositions.map((pos) => {
                const isWin = (pos.pnlUSD || 0) >= 0;
                return (
                  <tr key={pos.id} className="hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-gray-400">{pos.closeTimestamp?.split('T')[0] || pos.timestamp.split('T')[0]}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${pos.type === 'REAL' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-white">{pos.pair}</td>
                    <td className="py-2 px-3 font-bold text-emerald-400">{pos.side}</td>
                    <td className="py-2 px-3">${pos.entryPrice.toLocaleString()}</td>
                    <td className="py-2 px-3">${pos.closePrice?.toLocaleString() || '-'}</td>
                    <td className={`py-2 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${pos.pnlUSD?.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{pos.pnlPercent?.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
