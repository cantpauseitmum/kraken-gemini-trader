import fs from 'fs';
import path from 'path';
import { storage, AppSettings } from './storageService.js';

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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USER_STRATEGIES_FILE = path.join(DATA_DIR, 'strategies.json');

const BUILT_IN_STRATEGIES: StrategyProfile[] = [
  {
    id: 'builtin_conservative',
    name: 'Conservative Trend Follower',
    description: 'Low-risk momentum strategy focusing on SMA 50/200 crossovers and strict 2% stop-loss caps.',
    isBuiltIn: true,
    timeframeMinutes: 60,
    aiPersona: 'CONSERVATIVE',
    promptInstructions: 'Prioritize capital preservation. Require strong confluence across RSI, SMA, and MACD before signaling BUY or SELL.',
    riskManagement: {
      maxPositionSizePercent: 5,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.0,
      dailyLossLimitUSD: 250,
      requireManualConfirmation: true,
    },
    technicalRules: {
      rsiOversoldThreshold: 30,
      rsiOverboughtThreshold: 70,
      useMacdConfirmation: true,
      useBollingerBandsFilter: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin_balanced',
    name: 'Gemini Deep Quant (Balanced)',
    description: 'Balanced AI trading profile optimizing position sizing dynamically based on Gemini confidence scores.',
    isBuiltIn: true,
    timeframeMinutes: 60,
    aiPersona: 'BALANCED',
    promptInstructions: 'Analyze market structure, volume delta, and key resistance levels. Adapt position size between 5% and 15% based on confidence.',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin_aggressive',
    name: 'Aggressive Momentum Scalper',
    description: 'High-frequency 15-minute timeframe scalping strategy designed for quick market breakout capture.',
    isBuiltIn: true,
    timeframeMinutes: 15,
    aiPersona: 'SCALPER',
    promptInstructions: 'Act swiftly on fast breakout signals and volume spikes. Take partial profits quickly.',
    riskManagement: {
      maxPositionSizePercent: 15,
      stopLossPercent: 1.5,
      takeProfitPercent: 3.0,
      dailyLossLimitUSD: 1000,
      requireManualConfirmation: false,
    },
    technicalRules: {
      rsiOversoldThreshold: 40,
      rsiOverboughtThreshold: 60,
      useMacdConfirmation: false,
      useBollingerBandsFilter: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class StrategyManager {
  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Get all available strategies (built-in templates + user saved presets)
   */
  getStrategies(): StrategyProfile[] {
    const userStrategies = this.getUserStrategies();
    return [...BUILT_IN_STRATEGIES, ...userStrategies];
  }

  /**
   * Get user custom saved strategies from data/strategies.json
   */
  getUserStrategies(): StrategyProfile[] {
    try {
      if (fs.existsSync(USER_STRATEGIES_FILE)) {
        const raw = fs.readFileSync(USER_STRATEGIES_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading user strategies:', e);
    }
    return [];
  }

  /**
   * Save or update a strategy preset
   */
  saveStrategy(profile: Partial<StrategyProfile>): StrategyProfile {
    const userStrategies = this.getUserStrategies();
    const now = new Date().toISOString();

    let targetId = profile.id;
    if (!targetId || targetId.startsWith('builtin_')) {
      targetId = `custom_strat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    const existingIndex = userStrategies.findIndex((s) => s.id === targetId);

    const fullProfile: StrategyProfile = {
      id: targetId,
      name: profile.name || 'Custom Strategy Preset',
      description: profile.description || 'Custom user configured trading profile.',
      isBuiltIn: false,
      timeframeMinutes: profile.timeframeMinutes || 60,
      aiPersona: profile.aiPersona || 'BALANCED',
      promptInstructions: profile.promptInstructions || 'Analyze market technicals and risk parameters.',
      riskManagement: profile.riskManagement || {
        maxPositionSizePercent: 10,
        stopLossPercent: 2.5,
        takeProfitPercent: 5.0,
        dailyLossLimitUSD: 500,
        requireManualConfirmation: false,
      },
      technicalRules: profile.technicalRules || {
        rsiOversoldThreshold: 35,
        rsiOverboughtThreshold: 65,
        useMacdConfirmation: true,
        useBollingerBandsFilter: true,
      },
      createdAt: existingIndex !== -1 ? userStrategies[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex !== -1) {
      userStrategies[existingIndex] = fullProfile;
    } else {
      userStrategies.unshift(fullProfile);
    }

    fs.writeFileSync(USER_STRATEGIES_FILE, JSON.stringify(userStrategies, null, 2));
    console.log(`Saved strategy profile: ${fullProfile.name} (${fullProfile.id})`);
    return fullProfile;
  }

  /**
   * Delete a custom user strategy
   */
  deleteStrategy(id: string): boolean {
    if (id.startsWith('builtin_')) {
      throw new Error('Cannot delete built-in template strategies.');
    }
    const userStrategies = this.getUserStrategies();
    const filtered = userStrategies.filter((s) => s.id !== id);
    if (filtered.length !== userStrategies.length) {
      fs.writeFileSync(USER_STRATEGIES_FILE, JSON.stringify(filtered, null, 2));
      return true;
    }
    return false;
  }

  /**
   * Apply strategy profile to active AppSettings
   */
  activateStrategy(id: string): AppSettings {
    const all = this.getStrategies();
    const strat = all.find((s) => s.id === id);
    if (!strat) {
      throw new Error(`Strategy profile ${id} not found.`);
    }

    const updated = storage.saveSettings({
      tradeIntervalMinutes: strat.timeframeMinutes,
      riskManagement: strat.riskManagement,
    });

    console.log(`Activated strategy profile: ${strat.name}`);
    return updated;
  }
}

export const strategyManager = new StrategyManager();
