import React from 'react';
import { AppSettings } from '../types';
import { ShieldAlert, AlertTriangle, Lock, Save, RefreshCw } from 'lucide-react';

interface RiskControlsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  panicActive: boolean;
  onTogglePanic: () => void;
}

export const RiskControls: React.FC<RiskControlsProps> = ({
  settings,
  onUpdateSettings,
  panicActive,
  onTogglePanic,
}) => {
  const [formData, setFormData] = React.useState(settings.riskManagement);
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ riskManagement: formData });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Panic Kill Switch Banner */}
      <div className={`glass-panel p-6 rounded-2xl border transition-all ${
        panicActive
          ? 'bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-500/10'
          : 'border-gray-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${panicActive ? 'bg-rose-600 text-white animate-bounce' : 'bg-gray-800 text-gray-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Emergency Panic Kill Switch</h3>
              <p className="text-xs text-gray-400">
                Immediately blocks all real-money orders and halts auto-trading execution.
              </p>
            </div>
          </div>

          <button
            onClick={onTogglePanic}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              panicActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
          >
            {panicActive ? 'Deactivate Panic Switch' : 'ACTIVATE PANIC SWITCH'}
          </button>
        </div>
      </div>

      {/* Risk Limits Form */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Safety Guardrails & Order Limits</h3>
          </div>
          {saved && <span className="text-xs font-bold text-emerald-400">Settings Saved!</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Position Size % */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300 block">
              Max Position Size (% of Balance per Trade)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxPositionSizePercent}
              onChange={(e) => setFormData({ ...formData, maxPositionSizePercent: parseFloat(e.target.value) || 5 })}
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-gray-500">Cap maximum capital committed to a single AI order.</p>
          </div>

          {/* Daily Loss Limit USD */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300 block">
              Daily Loss Limit ($ USD)
            </label>
            <input
              type="number"
              min="10"
              value={formData.dailyLossLimitUSD}
              onChange={(e) => setFormData({ ...formData, dailyLossLimitUSD: parseFloat(e.target.value) || 100 })}
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-mono text-rose-400 font-bold"
            />
            <p className="text-[11px] text-gray-500">If today's total realized loss exceeds this value, real trading locks automatically.</p>
          </div>

          {/* Default Stop Loss % */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300 block">
              Default Stop Loss Target (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="20"
              value={formData.stopLossPercent}
              onChange={(e) => setFormData({ ...formData, stopLossPercent: parseFloat(e.target.value) || 2.5 })}
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-mono text-rose-400"
            />
          </div>

          {/* Default Take Profit % */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300 block">
              Default Take Profit Target (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="50"
              value={formData.takeProfitPercent}
              onChange={(e) => setFormData({ ...formData, takeProfitPercent: parseFloat(e.target.value) || 5.0 })}
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-mono text-emerald-400"
            />
          </div>
        </div>

        {/* Require Manual Confirmation Toggle */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block">Require Manual Trade Confirmation</span>
            <p className="text-[11px] text-gray-400">When enabled, real orders will prompt in the dashboard before submission.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireManualConfirmation}
              onChange={(e) => setFormData({ ...formData, requireManualConfirmation: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
          >
            <Save className="w-4 h-4" />
            Save Safety Guardrails
          </button>
        </div>
      </form>
    </div>
  );
};
