import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { storage } from './services/storageService.js';
import { krakenService } from './services/krakenService.js';
import { geminiService } from './services/geminiService.js';
import { paperTradingEngine } from './services/paperTradingEngine.js';
import { liveTradingEngine } from './services/liveTradingEngine.js';
import { backtestEngine } from './services/backtestEngine.js';
import { strategyManager } from './services/strategyManager.js';
import { versionService } from './services/versionService.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Background autonomous trading loop
let autoTradeTimer: NodeJS.Timeout | null = null;

function startAutoTradeLoop() {
  if (autoTradeTimer) clearInterval(autoTradeTimer);
  const settings = storage.getSettings();
  if (!settings.autoTradeEnabled) return;

  const intervalMs = Math.max(1, settings.tradeIntervalMinutes || 15) * 60 * 1000;
  console.log(`Auto-trade loop active. Running every ${settings.tradeIntervalMinutes} minutes.`);

  autoTradeTimer = setInterval(async () => {
    try {
      const currentSettings = storage.getSettings();
      if (!currentSettings.autoTradeEnabled) return;

      const pair = currentSettings.activePair || 'XBTUSD';
      console.log(`[AUTO-TRADE LOOP] Analyzing ${pair}...`);

      const ticker = await krakenService.getTicker(pair);
      const candles = await krakenService.getOHLCV(pair, 60);
      const { decision, indicators } = await geminiService.analyzeMarket(pair, ticker, candles);

      // Save thought log
      storage.addThought({
        id: `thought_${Date.now()}`,
        timestamp: new Date().toISOString(),
        pair,
        action: decision.action,
        confidence: decision.confidence,
        price: ticker.last,
        reasoning: decision.rationale,
        technicalIndicators: indicators,
        riskLevel: decision.riskLevel,
        mode: currentSettings.tradingMode,
      });

      // Update paper open positions (stop loss / take profit check)
      await paperTradingEngine.updateOpenPositions({ [pair]: ticker.last });

      // Execute trade signal
      if (currentSettings.tradingMode === 'PAPER') {
        await paperTradingEngine.executeSignal(pair, decision, ticker.last);
      } else if (currentSettings.tradingMode === 'REAL') {
        await liveTradingEngine.executeLiveSignal(pair, decision, ticker.last);
      }
    } catch (err: any) {
      console.error('[AUTO-TRADE LOOP ERROR]:', err.message);
    }
  }, intervalMs);
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tradingMode: storage.getSettings().tradingMode,
    panicActive: liveTradingEngine.isPanicStopActive(),
  });
});

// Version check endpoint
app.get('/api/version/check', async (req, res) => {
  try {
    const status = await versionService.checkVersion();
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// App Settings
app.get('/api/settings', (req, res) => {
  res.json(storage.getSettings());
});

app.post('/api/settings', (req, res) => {
  const current = storage.getSettings();

  // Log Trading Mode Switch
  if (req.body.tradingMode && req.body.tradingMode !== current.tradingMode) {
    storage.addThought({
      id: `sys_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pair: req.body.activePair || current.activePair || 'XBTUSD',
      action: 'INFO',
      confidence: 100,
      price: 0,
      reasoning: `SYSTEM EVENT: Trading Mode switched to ${req.body.tradingMode} mode.`,
      technicalIndicators: {},
      riskLevel: 'LOW',
      mode: req.body.tradingMode,
      logType: 'SYSTEM',
    });
  }

  // Log Auto-Trade Loop Toggle
  if (req.body.autoTradeEnabled !== undefined && req.body.autoTradeEnabled !== current.autoTradeEnabled) {
    storage.addThought({
      id: `sys_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pair: current.activePair || 'XBTUSD',
      action: 'INFO',
      confidence: 100,
      price: 0,
      reasoning: `SYSTEM EVENT: Autonomous Trading Loop ${req.body.autoTradeEnabled ? 'ACTIVATED (Interval: ' + (req.body.tradeIntervalMinutes || current.tradeIntervalMinutes || 15) + 'm)' : 'PAUSED'}.`,
      technicalIndicators: {},
      riskLevel: 'LOW',
      mode: current.tradingMode,
      logType: 'SYSTEM',
    });
  }

  const updated = storage.saveSettings(req.body);
  startAutoTradeLoop();
  res.json({ success: true, settings: updated });
});

// Portainer Webhook Redeploy Endpoint
app.post('/api/settings/redeploy-portainer', async (req, res) => {
  const { webhookUrl } = req.body;
  const targetUrl = webhookUrl || storage.getSettings().portainerWebhookUrl;

  if (!targetUrl) {
    return res.status(400).json({ success: false, message: 'No Portainer Webhook URL configured.' });
  }

  try {
    // Disable SSL verification for self-signed Portainer certificates if needed
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Portainer stack update triggered successfully!' : `Portainer returned HTTP status ${response.status}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Failed to trigger Portainer webhook: ${err.message}` });
  }
});
app.get('/api/strategies', (req, res) => {
  res.json(strategyManager.getStrategies());
});

app.post('/api/strategies/save', (req, res) => {
  try {
    const saved = strategyManager.saveStrategy(req.body);
    res.json({ success: true, strategy: saved });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/strategies/activate', (req, res) => {
  try {
    const { id } = req.body;
    const updatedSettings = strategyManager.activateStrategy(id);
    startAutoTradeLoop();
    res.json({ success: true, settings: updatedSettings });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/strategies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = strategyManager.deleteStrategy(id);
    res.json({ success: deleted });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Independent API connection test endpoints
app.post('/api/settings/test-gemini', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const keyToTest = apiKey || storage.getSettings().geminiApiKey || process.env.GEMINI_API_KEY;
    const modelToTest = model || storage.getSettings().geminiModel || 'gemini-2.0-flash';

    const result = await geminiService.testConnection(keyToTest, modelToTest);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/settings/fetch-gemini-models', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const keyToFetch = apiKey !== undefined ? apiKey : (storage.getSettings().geminiApiKey || process.env.GEMINI_API_KEY);
    const result = await geminiService.fetchAvailableModels(keyToFetch);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/settings/test-kraken', async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    const keyToTest = apiKey !== undefined ? apiKey : storage.getSettings().krakenApiKey;
    const secretToTest = apiSecret !== undefined ? apiSecret : storage.getSettings().krakenApiSecret;

    const result = await krakenService.testConnection(keyToTest, secretToTest);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Market Data
app.get('/api/market/ticker', async (req, res) => {
  try {
    const pair = (req.query.pair as string) || storage.getSettings().activePair || 'XBTUSD';
    const ticker = await krakenService.getTicker(pair);
    res.json(ticker);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/market/ohlc', async (req, res) => {
  try {
    const pair = (req.query.pair as string) || storage.getSettings().activePair || 'XBTUSD';
    const interval = parseInt((req.query.interval as string) || '60', 10);
    const candles = await krakenService.getOHLCV(pair, interval);
    res.json(candles);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// AI Market Analysis Trigger
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const pair = req.body.pair || storage.getSettings().activePair || 'XBTUSD';
    const executeTrade = req.body.executeTrade ?? true;

    const ticker = await krakenService.getTicker(pair);
    const candles = await krakenService.getOHLCV(pair, 60);

    const { decision, indicators } = await geminiService.analyzeMarket(pair, ticker, candles);
    const settings = storage.getSettings();

    const thoughtLog = {
      id: `thought_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pair,
      action: decision.action,
      confidence: decision.confidence,
      price: ticker.last,
      reasoning: decision.rationale,
      technicalIndicators: indicators,
      riskLevel: decision.riskLevel,
      mode: settings.tradingMode,
    };
    storage.addThought(thoughtLog);

    let executedPosition = null;
    if (executeTrade && decision.action !== 'HOLD') {
      if (settings.tradingMode === 'PAPER') {
        executedPosition = await paperTradingEngine.executeSignal(pair, decision, ticker.last);
      } else if (settings.tradingMode === 'REAL') {
        executedPosition = await liveTradingEngine.executeLiveSignal(pair, decision, ticker.last);
      }
    }

    res.json({
      ticker,
      decision,
      indicators,
      executedPosition,
      thoughtLog,
    });
  } catch (e: any) {
    const rawMsg = e.message || 'Unknown analysis error';
    let provider: 'GEMINI' | 'KRAKEN' | 'SYSTEM' = 'SYSTEM';
    let suggestion = 'Check your API configuration and logs.';

    if (rawMsg.toLowerCase().includes('gemini') || rawMsg.includes('429') || rawMsg.includes('404')) {
      provider = 'GEMINI';
      if (rawMsg.includes('429')) {
        suggestion = 'Gemini API Rate Limit hit. Wait 60 seconds or switch model to gemini-2.0-flash in Settings.';
      } else if (rawMsg.includes('404')) {
        suggestion = 'Gemini Model not found. Click "Download Available Models" in Settings to update.';
      } else {
        suggestion = 'Verify your Gemini API Key in Settings Modal.';
      }
    } else if (rawMsg.toLowerCase().includes('kraken') || rawMsg.includes('API-Key') || rawMsg.includes('Signature')) {
      provider = 'KRAKEN';
      suggestion = 'Verify your Kraken API Key & Secret permissions (Query Funds & Place Orders enabled).';
    }

    const errThought = {
      id: `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pair: req.body?.pair || 'XBTUSD',
      action: 'ERROR' as const,
      confidence: 0,
      price: 0,
      reasoning: `[${provider} ERROR] ${rawMsg}`,
      technicalIndicators: {},
      riskLevel: 'HIGH' as const,
      mode: storage.getSettings().tradingMode,
      logType: 'ERROR' as const,
      errorDetails: {
        provider,
        code: 'ANALYSIS_FAILURE',
        rawMessage: rawMsg,
        suggestion,
      },
    };
    storage.addThought(errThought);

    res.status(500).json({ error: e.message, thoughtLog: errThought });
  }
});

// Account Balance & Real/Paper Status
app.get('/api/account/balance', async (req, res) => {
  const settings = storage.getSettings();
  if (settings.tradingMode === 'PAPER') {
    return res.json({
      mode: 'PAPER',
      balanceUSD: settings.paperBalanceUSD,
      hasKeys: true,
    });
  }

  // REAL Trading Mode
  if (!settings.krakenApiKey || !settings.krakenApiSecret) {
    return res.json({
      mode: 'REAL',
      balanceUSD: null,
      hasKeys: false,
      error: 'Kraken API Key & Secret not configured in Settings.',
    });
  }

  try {
    const balances = await krakenService.getAccountBalances(
      settings.krakenApiKey,
      settings.krakenApiSecret
    );
    // Extract USD or ZUSD balance
    const usdBalance = balances['ZUSD'] || balances['USD'] || 0;
    res.json({
      mode: 'REAL',
      balanceUSD: usdBalance,
      allBalances: balances,
      hasKeys: true,
    });
  } catch (err: any) {
    res.json({
      mode: 'REAL',
      balanceUSD: null,
      hasKeys: true,
      error: err.message,
    });
  }
});

// Positions & Trade History
app.get('/api/positions', async (req, res) => {
  const settings = storage.getSettings();
  if (settings.tradingMode === 'PAPER') {
    return res.json(storage.getPositions());
  }

  // REAL Mode: Fetch live positions & trade history from Kraken
  if (!settings.krakenApiKey || !settings.krakenApiSecret) {
    return res.json([]);
  }

  try {
    const realOpen = await krakenService.getOpenPositions(
      settings.krakenApiKey,
      settings.krakenApiSecret
    );
    const realHistory = await krakenService.getTradesHistory(
      settings.krakenApiKey,
      settings.krakenApiSecret
    );
    res.json([...realOpen, ...realHistory]);
  } catch (e: any) {
    console.warn('Error fetching REAL positions from Kraken:', e.message);
    res.json([]);
  }
});

app.post('/api/positions/close', async (req, res) => {
  try {
    const { id, pair } = req.body;
    const ticker = await krakenService.getTicker(pair || 'XBTUSD');
    const closed = paperTradingEngine.closePosition(id, ticker.last, 'Manual User Close');
    if (!closed) {
      return res.status(404).json({ error: 'Position not found or already closed' });
    }
    res.json({ success: true, position: closed });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// AI Thought Logs
app.get('/api/thoughts', (req, res) => {
  res.json(storage.getThoughts());
});

// Backtesting API
app.post('/api/backtest/run', async (req, res) => {
  try {
    const { pair = 'XBTUSD', timeframeIntervalMinutes = 60, initialBalance = 10000, useAiEvaluations = false } = req.body;
    const result = await backtestEngine.runBacktest({
      pair,
      timeframeIntervalMinutes: parseInt(timeframeIntervalMinutes, 10),
      initialBalance: parseFloat(initialBalance),
      useAiEvaluations: Boolean(useAiEvaluations),
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/backtest/history', (req, res) => {
  res.json(storage.getBacktestResults());
});

// Emergency Panic Switch
app.post('/api/panic', (req, res) => {
  const { enable } = req.body;
  liveTradingEngine.setPanicStop(Boolean(enable));
  res.json({ success: true, panicActive: liveTradingEngine.isPanicStopActive() });
});

// Serve frontend build in production
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  console.log(`Serving frontend static build from ${distDir}`);
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn(`WARNING: Frontend dist directory not found at ${distDir}`);
}

// Start server listening on all network interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`KrakAI Trader running on http://0.0.0.0:${PORT}`);
  console.log(`Trading Mode: ${storage.getSettings().tradingMode}`);
  console.log(`====================================================`);
  startAutoTradeLoop();
});
