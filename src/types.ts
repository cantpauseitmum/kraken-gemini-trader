export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  krakenApiKey: string;
  krakenApiSecret: string;
  portainerWebhookUrl?: string;
  tradingMode: 'PAPER' | 'REAL';
  activePair: string;
  monitoredPairs?: string[];
  multiPairScanEnabled?: boolean;
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

export interface KrakenTicker {
  pair: string;
  ask: number;
  bid: number;
  last: number;
  volume24h: number;
  vwap24h: number;
  high24h: number;
  low24h: number;
  open24h: number;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vwap: number;
  volume: number;
  count: number;
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

export interface ThoughtLog {
  id: string;
  timestamp: string;
  pair: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'ERROR' | 'INFO';
  confidence: number;
  price: number;
  reasoning: string;
  technicalIndicators: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  mode: 'PAPER' | 'REAL' | 'BACKTEST';
  logType?: 'ANALYSIS' | 'ORDER' | 'SYSTEM' | 'ERROR';
  errorDetails?: {
    provider?: 'GEMINI' | 'KRAKEN' | 'SYSTEM';
    code?: string;
    rawMessage: string;
    suggestion?: string;
  };
}

export interface VersionStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  checkedAt: string;
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
