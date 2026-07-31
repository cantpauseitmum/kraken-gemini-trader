import React, { useState, useEffect } from 'react';
import { Sliders, Plus, CheckCircle2, Shield, Zap, Sparkles, Trash2, Edit3, Save, X } from 'lucide-react';

export interface StrategyProfile {
  id: string;
  name: string;
  description: string;
  isBuiltIn?: boolean;
  timeframeMinutes: number;
  aiPersona: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'SCALPER';
  promptInstructions: string;
  riskManagement: {
    maxPositionSizePercent: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    dailyLossLimitUSD: number;
    requireManualConfirmation: boolean;
  };
  technicalRules: {
    rsiOversoldThreshold: number;
    rsiOverboughtThreshold: number;
    useMacdConfirmation: boolean;
    useBollingerBandsFilter: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface StrategyManagerProps {
  onActivateStrategy: (id: string) => Promise<void>;
  activeStrategyId?: string;
}

export const StrategyManager: React.FC<StrategyManagerProps> = ({ onActivateStrategy, activeStrategyId }) => {
  const [strategies, setStrategies] = useState<StrategyProfile[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(activeStrategyId);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for creating/editing
  const [editForm, setEditForm] = useState<Partial<StrategyProfile>>({
    name: '',
    description: '',
    timeframeMinutes: 60,
    aiPersona: 'BALANCED',
    promptInstructions: '',
    riskManagement: {
      maxPositionSizePercent: 10,
      stopLossPercent: 2.5,
      takeProfitPercent: 5.0,
      dailyLossLimitUSD: 500,
      requireManualConfirmation: false,
    },
    technicalRules: {
      rsiOversoldThreshold: 35,
      rsiOverboughtThreshold: 65,
      useMacdConfirmation: true,
      useBollingerBandsFilter: true,
    },
  });

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const res = await fetch('/api/strategies');
      const data = await res.json();
      setStrategies(data);
    } catch (e) {
      console.error('Error loading strategies:', e);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await onActivateStrategy(id);
      setActiveId(id);
    } catch (e: any) {
      alert(`Strategy Activation Error: ${e.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/strategies/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchStrategies();
      }
    } catch (e: any) {
      alert(`Save Error: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom strategy preset?')) return;
    try {
      const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchStrategies();
    } catch (e: any) {
      alert(`Delete Error: ${e.message}`);
    }
  };

  const openCreateModal = () => {
    setEditForm({
      name: 'My Custom Strategy',
      description: 'Custom AI trading strategy configuration.',
      timeframeMinutes: 60,
      aiPersona: 'BALANCED',
      promptInstructions: 'Evaluate market technicals and RSI momentum before signaling entry.',
      riskManagement: {
        maxPositionSizePercent: 10,
        stopLossPercent: 2.5,
        takeProfitPercent: 5.0,
        dailyLossLimitUSD: 500,
        requireManualConfirmation: false,
      },
      technicalRules: {
        rsiOversoldThreshold: 35,
        rsiOverboughtThreshold: 65,
        useMacdConfirmation: true,
        useBollingerBandsFilter: true,
      },
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Create Preset Action */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Strategy Presets & Custom Profiles
          </h2>
          <p className="text-xs text-gray-400">
            Configure, save, and switch between trading strategies. Personal configurations are saved locally in <code className="text-blue-400 font-mono text-[11px]">data/strategies.json</code> (excluded from git).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Strategy Preset
        </button>
      </div>

      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strat) => {
          const isActive = activeId === strat.id;

          const personaBadge =
            strat.aiPersona === 'CONSERVATIVE'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : strat.aiPersona === 'AGGRESSIVE' || strat.aiPersona === 'SCALPER'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

          return (
            <div
              key={strat.id}
              className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'border-blue-500 bg-slate-900/90 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${personaBadge}`}>
                    {strat.aiPersona}
                  </span>

                  {strat.isBuiltIn ? (
                    <span className="text-[10px] text-gray-500 font-mono">Built-In Template</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(strat.id)}
                        className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                        title="Delete Custom Strategy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{strat.name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{strat.description}</p>
                </div>

                {/* Strategy Parameter Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-gray-800/80">
                  <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">TIMEFRAME</span>
                    <span className="text-gray-200 font-bold">{strat.timeframeMinutes}m Candles</span>
                  </div>

                  <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">MAX POSITION</span>
                    <span className="text-blue-400 font-bold">{strat.riskManagement.maxPositionSizePercent}% Capital</span>
                  </div>

                  <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">STOP LOSS</span>
                    <span className="text-rose-400 font-bold">{strat.riskManagement.stopLossPercent}%</span>
                  </div>

                  <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">TAKE PROFIT</span>
                    <span className="text-emerald-400 font-bold">{strat.riskManagement.takeProfitPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleActivate(strat.id)}
                  disabled={isActive}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      Active Strategy Profile
                    </>
                  ) : (
                    'Activate Strategy Profile'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategy Preset Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-gray-800 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">Create Custom Strategy Preset</h3>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Strategy Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-950 text-white p-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-gray-950 text-white p-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">AI Persona</label>
                  <select
                    value={editForm.aiPersona}
                    onChange={(e) => setEditForm({ ...editForm, aiPersona: e.target.value as any })}
                    className="w-full bg-gray-950 text-white p-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CONSERVATIVE">Conservative</option>
                    <option value="BALANCED">Balanced</option>
                    <option value="AGGRESSIVE">Aggressive</option>
                    <option value="SCALPER">Scalper</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Timeframe</label>
                  <select
                    value={editForm.timeframeMinutes}
                    onChange={(e) => setEditForm({ ...editForm, timeframeMinutes: parseInt(e.target.value, 10) })}
                    className="w-full bg-gray-950 text-white p-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={240}>4 Hours</option>
                    <option value={1440}>1 Day</option>
                  </select>
                </div>
              </div>

              {/* Risk Settings */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                <span className="font-bold text-gray-300 block">Risk Management Rules</span>
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <label className="text-[10px] text-gray-400 block">Max Size %</label>
                    <input
                      type="number"
                      value={editForm.riskManagement?.maxPositionSizePercent}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          riskManagement: { ...editForm.riskManagement!, maxPositionSizePercent: parseFloat(e.target.value) || 10 },
                        })
                      }
                      className="w-full bg-gray-950 text-white p-2 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block">Stop Loss %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.riskManagement?.stopLossPercent}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          riskManagement: { ...editForm.riskManagement!, stopLossPercent: parseFloat(e.target.value) || 2.5 },
                        })
                      }
                      className="w-full bg-gray-950 text-white p-2 rounded-lg border border-gray-700 text-rose-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block">Take Profit %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.riskManagement?.takeProfitPercent}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          riskManagement: { ...editForm.riskManagement!, takeProfitPercent: parseFloat(e.target.value) || 5.0 },
                        })
                      }
                      className="w-full bg-gray-950 text-white p-2 rounded-lg border border-gray-700 text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                >
                  Save Strategy Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
