import React from 'react';
import { AppSettings, VersionStatus } from '../types';
import {
  Brain,
  ShieldAlert,
  Settings,
  Zap,
  Activity,
  DollarSign,
  Play,
  Pause,
  AlertTriangle,
  Sliders,
  ArrowUpCircle
} from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  panicActive: boolean;
  onTogglePanic: () => void;
  versionStatus?: VersionStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  activeTab,
  setActiveTab,
  isAnalyzing,
  onRunAnalysis,
  panicActive,
  onTogglePanic,
  versionStatus,
}) => {
  const toggleTradingMode = () => {
    const nextMode = settings.tradingMode === 'PAPER' ? 'REAL' : 'PAPER';
    if (nextMode === 'REAL' && !confirm('WARNING: Switching to REAL money trading mode will place real orders on Kraken using your funds. Continue?')) {
      return;
    }
    onUpdateSettings({ tradingMode: nextMode });
  };

  const toggleAutoTrade = () => {
    onUpdateSettings({ autoTradeEnabled: !settings.autoTradeEnabled });
  };

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-gray-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/20 text-white">
          <Brain className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-wide">KrakAI Trader</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
              {versionStatus?.currentVersion || 'v0.0.9-alpha'}
            </span>

            {versionStatus?.updateAvailable && (
              <a
                href={versionStatus.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all animate-pulse"
                title={`New release available: ${versionStatus.latestVersion}. Click to view on GitHub.`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
                Update Available ({versionStatus.latestVersion})
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400">Autonomous Trading & Analytics Suite</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
        {[
          { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
          { id: 'strategies', label: 'Strategy Presets', icon: Sliders },
          { id: 'backtest', label: 'Backtest Lab', icon: Zap },
          { id: 'positions', label: 'Positions', icon: DollarSign },
          { id: 'risk', label: 'Risk & Guardrails', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Control Buttons & Mode Toggles */}
      <div className="flex items-center gap-3">
        {/* Mode Switcher */}
        <button
          onClick={toggleTradingMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            settings.tradingMode === 'REAL'
              ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 shadow-lg shadow-red-500/10'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
          title="Click to toggle Paper vs Real Money mode"
        >
          <span className={`w-2 h-2 rounded-full ${settings.tradingMode === 'REAL' ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
          {settings.tradingMode === 'REAL' ? 'REAL MONEY' : 'PAPER TRADING'}
        </button>

        {/* Auto Trade Loop Toggle */}
        <button
          onClick={toggleAutoTrade}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            settings.autoTradeEnabled
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
          }`}
        >
          {settings.autoTradeEnabled ? (
            <>
              <Pause className="w-3.5 h-3.5 text-indigo-400" />
              Auto: ON ({settings.tradeIntervalMinutes}m)
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Auto: OFF
            </>
          )}
        </button>

        {/* Manual Gemini Analysis Run */}
        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
        >
          <Brain className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Ask Gemini Pro'}
        </button>

        {/* Emergency Panic Switch */}
        <button
          onClick={onTogglePanic}
          className={`p-2 rounded-lg border transition-all ${
            panicActive
              ? 'bg-red-600 text-white border-red-500 animate-bounce shadow-lg shadow-red-600/40'
              : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-red-400 hover:border-red-500/50'
          }`}
          title={panicActive ? 'Panic Switch Active (Trades Blocked)' : 'Activate Emergency Kill Switch'}
        >
          <AlertTriangle className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-gray-800/80 text-gray-300 border border-gray-700 hover:text-white hover:bg-gray-700 transition-all"
          title="API Keys & Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
