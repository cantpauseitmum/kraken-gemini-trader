import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MarketChart } from './components/MarketChart';
import { GeminiThoughtStream } from './components/GeminiThoughtStream';
import { BacktestLab } from './components/BacktestLab';
import { PositionsTable } from './components/PositionsTable';
import { RiskControls } from './components/RiskControls';
import { SettingsModal } from './components/SettingsModal';
import { StrategyManager } from './components/StrategyManager';
import { AppSettings, KrakenTicker, OHLCV, TradePosition, ThoughtLog, BacktestResult } from './types';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ticker, setTicker] = useState<KrakenTicker | null>(null);
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [positions, setPositions] = useState<TradePosition[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtLog[]>([]);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePair, setActivePair] = useState('XBTUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState(60);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [panicActive, setPanicActive] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchSettings();
    fetchPositions();
    fetchThoughts();
    fetchBacktests();
    checkHealth();
  }, []);

  // Poll ticker & candles for active pair
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, [activePair, selectedTimeframe]);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setPanicActive(data.panicActive || false);
    } catch (e) {
      console.warn('Health check warning:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
      if (data.activePair) setActivePair(data.activePair);
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  const fetchMarketData = async () => {
    try {
      const [tickerRes, ohlcRes] = await Promise.all([
        fetch(`/api/market/ticker?pair=${activePair}`),
        fetch(`/api/market/ohlc?pair=${activePair}&interval=${selectedTimeframe}`),
      ]);
      const tickerData = await tickerRes.json();
      const ohlcData = await ohlcRes.json();
      setTicker(tickerData);
      setCandles(ohlcData);
    } catch (e) {
      console.error('Error fetching market data:', e);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setPositions(data);
    } catch (e) {
      console.error('Error fetching positions:', e);
    }
  };

  const fetchThoughts = async () => {
    try {
      const res = await fetch('/api/thoughts');
      const data = await res.json();
      setThoughts(data);
    } catch (e) {
      console.error('Error fetching thoughts:', e);
    }
  };

  const fetchBacktests = async () => {
    try {
      const res = await fetch('/api/backtest/history');
      const data = await res.json();
      setBacktests(data);
    } catch (e) {
      console.error('Error fetching backtest history:', e);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      setSettings(data.settings);
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: activePair, executeTrade: true }),
      });
      const data = await res.json();
      fetchThoughts();
      fetchPositions();
      fetchSettings();
    } catch (e: any) {
      alert(`AI Analysis Error: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClosePosition = async (id: string, pair: string) => {
    try {
      const res = await fetch('/api/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pair }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPositions();
        fetchSettings();
      }
    } catch (e) {
      console.error('Error closing position:', e);
    }
  };

  const handleRunBacktest = async (params: {
    pair: string;
    timeframeIntervalMinutes: number;
    initialBalance: number;
    useAiEvaluations: boolean;
  }) => {
    const res = await fetch('/api/backtest/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Backtest failed');
    }
    const result = await res.json();
    fetchBacktests();
    return result;
  };

  const handleTogglePanic = async () => {
    const nextState = !panicActive;
    try {
      const res = await fetch('/api/panic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: nextState }),
      });
      const data = await res.json();
      setPanicActive(data.panicActive);
    } catch (e) {
      console.error('Error toggling panic switch:', e);
    }
  };

  const handleActivateStrategy = async (id: string) => {
    const res = await fetch('/api/strategies/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      setSettings(data.settings);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg text-gray-400">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Initializing Kraken Gemini AI System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAnalyzing={isAnalyzing}
        onRunAnalysis={handleRunAnalysis}
        panicActive={panicActive}
        onTogglePanic={handleTogglePanic}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <MarketChart
                candles={candles}
                ticker={ticker}
                positions={positions}
                activePair={activePair}
                onSelectPair={setActivePair}
                selectedTimeframe={selectedTimeframe}
                onSelectTimeframe={setSelectedTimeframe}
              />
              <PositionsTable
                positions={positions}
                onClosePosition={handleClosePosition}
                paperBalance={settings.paperBalanceUSD}
              />
            </div>

            <div>
              <GeminiThoughtStream thoughts={thoughts} isAnalyzing={isAnalyzing} />
            </div>
          </div>
        )}

        {activeTab === 'strategies' && (
          <StrategyManager onActivateStrategy={handleActivateStrategy} />
        )}

        {activeTab === 'backtest' && (
          <BacktestLab onRunBacktest={handleRunBacktest} backtestHistory={backtests} />
        )}

        {activeTab === 'positions' && (
          <PositionsTable
            positions={positions}
            onClosePosition={handleClosePosition}
            paperBalance={settings.paperBalanceUSD}
          />
        )}

        {activeTab === 'risk' && (
          <RiskControls
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            panicActive={panicActive}
            onTogglePanic={handleTogglePanic}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
      />
    </div>
  );
};
