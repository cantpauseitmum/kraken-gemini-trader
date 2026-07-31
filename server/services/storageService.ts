import fs from 'fs';
import path from 'path';

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  krakenApiKey: string;
  krakenApiSecret: string;
  portainerWebhookUrl?: string;
  tradingMode: 'PAPER' | 'REAL';
  activePair: string;
  activeStrategyId?: string;
  autoTradeEnabled: boolean;
  tradeIntervalMinutes: number;
  paperBalanceUSD: number;
  riskManagement: {
    maxPositionSizePercent: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    dailyLossLimitUSD: number;
    requireManualConfirmation: boolean;
  };
}

export interface TradePosition {
  id: string;
  pair: string;
  side: 'BUY' | 'SELL';
  type: 'PAPER' | 'REAL';
  entryPrice: number;
  amount: number;
  valueUSD: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  closePrice?: number;
  closeTimestamp?: string;
  pnlUSD?: number;
  pnlPercent?: number;
  geminiReasoning?: string;
  geminiConfidence?: number;
}

export interface BacktestResult {
  id: string;
  pair: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  totalReturnPercent: number;
  winRatePercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  trades: TradePosition[];
  equityCurve: { time: string; balance: number }[];
  timestamp: string;
}

export interface ThoughtLog {
  id: string;
  timestamp: string;
  pair: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  reasoning: string;
  technicalIndicators: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  mode: 'PAPER' | 'REAL' | 'BACKTEST';
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const POSITIONS_FILE = path.join(DATA_DIR, 'positions.json');
const THOUGHTS_FILE = path.join(DATA_DIR, 'thoughts.json');
const BACKTESTS_FILE = path.join(DATA_DIR, 'backtests.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const defaultSettings: AppSettings = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  krakenApiKey: process.env.KRAKEN_API_KEY || '',
  krakenApiSecret: process.env.KRAKEN_API_SECRET || '',
  tradingMode: (process.env.DEFAULT_TRADING_MODE as 'PAPER' | 'REAL') || 'PAPER',
  activePair: process.env.DEFAULT_PAIR || 'XBTUSD',
  activeStrategyId: 'builtin_balanced',
  autoTradeEnabled: false,
  tradeIntervalMinutes: 15,
  paperBalanceUSD: parseFloat(process.env.INITIAL_PAPER_BALANCE || '10000'),
  riskManagement: {
    maxPositionSizePercent: 10,
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0,
    dailyLossLimitUSD: 500,
    requireManualConfirmation: false,
  },
};

export class StorageService {
  constructor() {
    ensureDataDir();
  }

  getSettings(): AppSettings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Error reading settings file:', e);
    }
    return defaultSettings;
  }

  saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    ensureDataDir();
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  }

  getPositions(): TradePosition[] {
    try {
      if (fs.existsSync(POSITIONS_FILE)) {
        const raw = fs.readFileSync(POSITIONS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading positions file:', e);
    }
    return [];
  }

  savePositions(positions: TradePosition[]): void {
    ensureDataDir();
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
  }

  addPosition(position: TradePosition): void {
    const positions = this.getPositions();
    positions.unshift(position);
    this.savePositions(positions);
  }

  updatePosition(id: string, updates: Partial<TradePosition>): TradePosition | null {
    const positions = this.getPositions();
    const index = positions.findIndex((p) => p.id === id);
    if (index !== -1) {
      positions[index] = { ...positions[index], ...updates };
      this.savePositions(positions);
      return positions[index];
    }
    return null;
  }

  getThoughts(limit = 50): ThoughtLog[] {
    try {
      if (fs.existsSync(THOUGHTS_FILE)) {
        const raw = fs.readFileSync(THOUGHTS_FILE, 'utf-8');
        const thoughts: ThoughtLog[] = JSON.parse(raw);
        return thoughts.slice(0, limit);
      }
    } catch (e) {
      console.error('Error reading thoughts file:', e);
    }
    return [];
  }

  addThought(thought: ThoughtLog): void {
    ensureDataDir();
    const thoughts = this.getThoughts(200);
    thoughts.unshift(thought);
    fs.writeFileSync(THOUGHTS_FILE, JSON.stringify(thoughts, null, 2));
  }

  getBacktestResults(): BacktestResult[] {
    try {
      if (fs.existsSync(BACKTESTS_FILE)) {
        const raw = fs.readFileSync(BACKTESTS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading backtests file:', e);
    }
    return [];
  }

  saveBacktestResult(result: BacktestResult): void {
    ensureDataDir();
    const backtests = this.getBacktestResults();
    backtests.unshift(result);
    // keep last 20
    fs.writeFileSync(BACKTESTS_FILE, JSON.stringify(backtests.slice(0, 20), null, 2));
  }
}

export const storage = new StorageService();
