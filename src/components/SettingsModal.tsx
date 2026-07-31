import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Settings, X, Key, ShieldCheck, Cpu, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-2.0-flash');
  const [krakenApiKey, setKrakenApiKey] = useState(settings.krakenApiKey);
  const [krakenApiSecret, setKrakenApiSecret] = useState(settings.krakenApiSecret);

  // Available Gemini models list
  const [availableModels, setAvailableModels] = useState<{ id: string; displayName: string }[]>([
    { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro' },
  ]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchMessage, setModelFetchMessage] = useState<string | null>(null);

  // Connection test states
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingKraken, setTestingKraken] = useState(false);
  const [krakenTestResult, setKrakenTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Auto fetch live models on mount / open
  React.useEffect(() => {
    if (isOpen) {
      handleFetchModels(geminiApiKey);
    }
  }, [isOpen]);

  const handleFetchModels = async (keyToUse?: string) => {
    setIsFetchingModels(true);
    setModelFetchMessage(null);
    try {
      const res = await fetch('/api/settings/fetch-gemini-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToUse ?? geminiApiKey }),
      });
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        // If current selected model is not in fetched list, set first available
        if (!data.models.some((m: any) => m.id === geminiModel)) {
          setGeminiModel(data.models[0].id);
        }
      }
      if (data.message) setModelFetchMessage(data.message);
    } catch (e: any) {
      console.warn('Failed to fetch models:', e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  if (!isOpen) return null;

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/settings/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey, model: geminiModel }),
      });
      const data = await res.json();
      setGeminiTestResult(data);
    } catch (e: any) {
      setGeminiTestResult({ success: false, message: e.message || 'Network error testing Gemini API' });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestKraken = async () => {
    setTestingKraken(true);
    setKrakenTestResult(null);
    try {
      const res = await fetch('/api/settings/test-kraken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: krakenApiKey, apiSecret: krakenApiSecret }),
      });
      const data = await res.json();
      setKrakenTestResult(data);
    } catch (e: any) {
      setKrakenTestResult({ success: false, message: e.message || 'Network error testing Kraken API' });
    } finally {
      setTestingKraken(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      geminiApiKey,
      geminiModel,
      krakenApiKey,
      krakenApiSecret,
    });
    onClose();
  };

  const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-gray-800 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base text-white">API Keys & Provider Diagnostics</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Gemini AI Config Section */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-gray-800">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                Google Gemini API
              </span>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                hasGeminiKey ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {hasGeminiKey ? 'Key Configured' : 'No Key (Rule-Based Mode)'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300">Gemini Pro API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter AIzaSy... API Key"
                className="w-full bg-gray-950 text-white text-xs px-3.5 py-2 rounded-xl border border-gray-700 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Model Engine</label>
                <button
                  type="button"
                  onClick={() => handleFetchModels(geminiApiKey)}
                  disabled={isFetchingModels}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono hover:underline disabled:opacity-50"
                  title="Query Google API for account models"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                  {isFetchingModels ? 'Fetching...' : 'Download Available Models'}
                </button>
              </div>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-gray-950 text-white text-xs px-3.5 py-2 rounded-xl border border-gray-700 font-mono focus:outline-none focus:border-blue-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              {modelFetchMessage && (
                <p className="text-[10px] text-gray-400 font-mono italic">{modelFetchMessage}</p>
              )}
            </div>

            {/* Test Gemini Button & Feedback */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingGemini ? 'animate-spin' : ''}`} />
                {testingGemini ? 'Testing Gemini API...' : 'Test Gemini Connection'}
              </button>

              {geminiTestResult && (
                <div className={`mt-2 p-3 rounded-xl text-xs flex items-start gap-2.5 border max-w-full overflow-hidden min-w-0 ${
                  geminiTestResult.success
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  {geminiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words break-all max-w-full min-w-0 overflow-hidden text-[11px] leading-relaxed">
                    {geminiTestResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Kraken Exchange Config Section */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-gray-800">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Kraken Exchange API
              </span>
              <span className="text-[10px] text-gray-400 font-mono">REST & Private API</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300">Kraken API Key</label>
              <input
                type="text"
                value={krakenApiKey}
                onChange={(e) => setKrakenApiKey(e.target.value)}
                placeholder="Enter Kraken API Key..."
                className="w-full bg-gray-950 text-white text-xs px-3.5 py-2 rounded-xl border border-gray-700 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300">Kraken API Secret</label>
              <input
                type="password"
                value={krakenApiSecret}
                onChange={(e) => setKrakenApiSecret(e.target.value)}
                placeholder="Enter Kraken API Secret..."
                className="w-full bg-gray-950 text-white text-xs px-3.5 py-2 rounded-xl border border-gray-700 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Test Kraken Button & Feedback */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestKraken}
                disabled={testingKraken}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingKraken ? 'animate-spin' : ''}`} />
                {testingKraken ? 'Testing Kraken API...' : 'Test Kraken Connection'}
              </button>

              {krakenTestResult && (
                <div className={`mt-2 p-3 rounded-xl text-xs flex items-start gap-2.5 border max-w-full overflow-hidden min-w-0 ${
                  krakenTestResult.success
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  {krakenTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words break-all max-w-full min-w-0 overflow-hidden text-[11px] leading-relaxed">
                    {krakenTestResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
            >
              Save API Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
