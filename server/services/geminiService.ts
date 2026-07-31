import { GoogleGenerativeAI } from '@google/generative-ai';
import { OHLCV, KrakenTicker } from './krakenService.js';
import { storage } from './storageService.js';

export interface TechnicalIndicators {
  rsi14: number;
  sma20: number;
  sma50: number;
  sma200: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  volume24h: number;
  priceChange24hPercent: number;
}

export interface GeminiTradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0 to 100
  recommendedPositionSizePercent: number; // 1 to 100
  suggestedStopLossPercent: number;
  suggestedTakeProfitPercent: number;
  rationale: string;
  keyTechnicalFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class GeminiService {
  /**
   * Compute technical indicators from candle history
   */
  public computeIndicators(candles: OHLCV[], ticker?: KrakenTicker): TechnicalIndicators {
    const closes = candles.map((c) => c.close);
    const len = closes.length;
    const currentPrice = ticker ? ticker.last : closes[len - 1] || 0;

    // SMA calculation
    const calcSMA = (period: number): number => {
      if (len < period) return currentPrice;
      const slice = closes.slice(len - period);
      const sum = slice.reduce((a, b) => a + b, 0);
      return sum / period;
    };

    const sma20 = calcSMA(20);
    const sma50 = calcSMA(50);
    const sma200 = calcSMA(200);

    // RSI 14 calculation
    let rsi14 = 50;
    if (len >= 15) {
      let gains = 0;
      let losses = 0;
      for (let i = len - 14; i < len; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) {
        rsi14 = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi14 = 100 - 100 / (1 + rs);
      }
    }

    // MACD (12, 26, 9)
    const calcEMA = (period: number): number => {
      if (len < period) return currentPrice;
      const k = 2 / (period + 1);
      let ema = closes[len - period];
      for (let i = len - period + 1; i < len; i++) {
        ema = closes[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const ema12 = calcEMA(12);
    const ema26 = calcEMA(26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.8; // Simplified signal calculation
    const histogram = macdLine - signalLine;

    // Bollinger Bands (20, 2)
    let variance = 0;
    if (len >= 20) {
      const slice = closes.slice(len - 20);
      const mean = sma20;
      variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / 20;
    }
    const stdDev = Math.sqrt(variance);
    const upper = sma20 + stdDev * 2;
    const lower = sma20 - stdDev * 2;
    const bandwidth = sma20 !== 0 ? ((upper - lower) / sma20) * 100 : 0;

    // 24h price change
    const firstPrice = ticker ? ticker.open24h : closes[0] || currentPrice;
    const priceChange24hPercent = firstPrice !== 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

    return {
      rsi14: Math.round(rsi14 * 100) / 100,
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      macd: {
        macdLine: Math.round(macdLine * 100) / 100,
        signalLine: Math.round(signalLine * 100) / 100,
        histogram: Math.round(histogram * 100) / 100,
      },
      bollingerBands: {
        upper: Math.round(upper * 100) / 100,
        middle: Math.round(sma20 * 100) / 100,
        lower: Math.round(lower * 100) / 100,
        bandwidth: Math.round(bandwidth * 100) / 100,
      },
      volume24h: ticker ? ticker.volume24h : 500,
      priceChange24hPercent: Math.round(priceChange24hPercent * 100) / 100,
    };
  }

  /**
   * Main AI decision generator using Gemini Pro
   */
  async analyzeMarket(
    pair: string,
    ticker: KrakenTicker,
    candles: OHLCV[]
  ): Promise<{ decision: GeminiTradeDecision; indicators: TechnicalIndicators }> {
    const settings = storage.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const modelName = settings.geminiModel || process.env.GEMINI_MODEL || 'gemini-1.5-pro';

    const indicators = this.computeIndicators(candles, ticker);

    if (!apiKey) {
      console.warn('No Gemini API key provided. Using rule-based algorithmic fallback.');
      return {
        decision: this.generateRuleBasedFallback(pair, ticker.last, indicators),
        indicators,
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const prompt = `
You are an expert quantitative crypto trader operating on Gemini Pro. Analyze the following market metrics for trading pair ${pair} and provide a strict JSON decision on whether to BUY, SELL, or HOLD.

[MARKET SNAPSHOT]
Pair: ${pair}
Current Price: $${ticker.last} USD
24h High: $${ticker.high24h} | 24h Low: $${ticker.low24h}
24h Change: ${indicators.priceChange24hPercent}%
Volume (24h): ${ticker.volume24h}

[TECHNICAL INDICATORS]
- RSI (14): ${indicators.rsi14} ${indicators.rsi14 < 30 ? '(Oversold)' : indicators.rsi14 > 70 ? '(Overbought)' : '(Neutral)'}
- SMA (20): $${indicators.sma20}
- SMA (50): $${indicators.sma50}
- SMA (200): $${indicators.sma200}
- MACD Line: ${indicators.macd.macdLine} | Signal: ${indicators.macd.signalLine} | Histogram: ${indicators.macd.histogram}
- Bollinger Bands: Upper $${indicators.bollingerBands.upper} | Middle $${indicators.bollingerBands.middle} | Lower $${indicators.bollingerBands.lower}

[RISK CONSTRAINTS]
Max Position Size: ${settings.riskManagement.maxPositionSizePercent}% of balance
Default Stop-Loss: ${settings.riskManagement.stopLossPercent}%
Default Take-Profit: ${settings.riskManagement.takeProfitPercent}%

Respond strictly in valid JSON matching this exact structure:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "recommendedPositionSizePercent": number (1-100),
  "suggestedStopLossPercent": number,
  "suggestedTakeProfitPercent": number,
  "rationale": "Clear, concise technical and market justification",
  "keyTechnicalFactors": ["Factor 1", "Factor 2", "Factor 3"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}
`;

      const response = await model.generateContent(prompt);
      const text = response.response.text() || '';
      const parsed: GeminiTradeDecision = JSON.parse(text);

      // Validate schema
      if (!['BUY', 'SELL', 'HOLD'].includes(parsed.action)) {
        parsed.action = 'HOLD';
      }

      return { decision: parsed, indicators };
    } catch (error: any) {
      console.error('Gemini API Error, reverting to technical fallback:', error.message);
      return {
        decision: this.generateRuleBasedFallback(pair, ticker.last, indicators, error.message),
        indicators,
      };
    }
  }

  /**
   * Fetch list of available models supporting generateContent from Gemini API
   */
  async fetchAvailableModels(apiKey?: string): Promise<{ success: boolean; models: { id: string; displayName: string }[]; message?: string }> {
    const defaultList = [
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Recommended)' },
      { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro' },
    ];

    if (!apiKey || apiKey.trim() === '') {
      return { success: true, models: defaultList, message: 'Default model list loaded (enter API key to fetch account-specific models).' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to list models');
      }

      if (Array.isArray(data.models)) {
        const supported = data.models
          .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => {
            const cleanId = m.name.replace(/^models\//, '');
            return {
              id: cleanId,
              displayName: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
            };
          });

        if (supported.length > 0) {
          return { success: true, models: supported, message: `Successfully fetched ${supported.length} available Gemini models.` };
        }
      }

      return { success: true, models: defaultList, message: 'Loaded standard model defaults.' };
    } catch (err: any) {
      console.warn('Error fetching Gemini models:', err.message);
      return { success: false, models: defaultList, message: `Could not fetch live models: ${err.message}` };
    }
  }

  /**
   * Test connection to Gemini API with provided API key
   */
  async testConnection(apiKey: string, modelName = 'gemini-2.0-flash'): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.trim() === '') {
      return { success: false, message: 'Gemini API Key is not set. Please enter a valid Gemini API Key to enable live AI signals.' };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent('Respond with only the word OK if you can read this.');
      const text = res.response.text();
      return {
        success: true,
        message: `Gemini API connection successful! Model (${modelName}) responded: "${text.trim()}"`,
      };
    } catch (err: any) {
      let rawMsg = err.message || 'Failed to authenticate with Gemini API';
      let cleanMsg = rawMsg;
      
      if (rawMsg.includes('429') || rawMsg.includes('Quota Exceeded') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        cleanMsg = '[429 Rate Limit Exceeded] You have exceeded your Gemini API request quota or free tier rate limit. Please check your Gemini API plan / quota limits.';
      } else if (rawMsg.includes('404')) {
        cleanMsg = '[404 Model Not Found] The selected model is not available for this API key. Use "Download Available Models" above to pick a supported model.';
      } else if (rawMsg.includes('400') || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
        cleanMsg = '[400 Invalid API Key] The provided Gemini API key is invalid or unrecognized.';
      }

      return {
        success: false,
        message: `Gemini API Error: ${cleanMsg}`,
      };
    }
  }

  /**
   * Fallback rule-based signal generator when API key is unconfigured or rate limited
   */
  private generateRuleBasedFallback(
    pair: string,
    price: number,
    ind: TechnicalIndicators,
    errorMsg?: string
  ): GeminiTradeDecision {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    const factors: string[] = [];

    // Simple quantitative logic
    if (ind.rsi14 < 32 && price <= ind.bollingerBands.lower * 1.01) {
      action = 'BUY';
      confidence = 82;
      factors.push(`RSI Oversold (${ind.rsi14})`, `Price near Lower Bollinger Band ($${ind.bollingerBands.lower})`);
    } else if (ind.rsi14 > 68 && price >= ind.bollingerBands.upper * 0.99) {
      action = 'SELL';
      confidence = 78;
      factors.push(`RSI Overbought (${ind.rsi14})`, `Price near Upper Bollinger Band ($${ind.bollingerBands.upper})`);
    } else if (ind.macd.histogram > 0 && ind.rsi14 > 45 && ind.rsi14 < 60 && price > ind.sma20) {
      action = 'BUY';
      confidence = 68;
      factors.push('MACD Bullish Crossover', 'Price trading above SMA20');
    } else if (ind.macd.histogram < 0 && price < ind.sma20) {
      action = 'SELL';
      confidence = 65;
      factors.push('MACD Bearish Crossover', 'Price trading below SMA20');
    } else {
      factors.push('RSI in Neutral Zone', 'No strong momentum convergence');
    }

    const note = errorMsg ? ` (Gemini Note: ${errorMsg})` : ' (Rule-based technical algorithm mode)';

    return {
      action,
      confidence,
      recommendedPositionSizePercent: action === 'HOLD' ? 0 : 10,
      suggestedStopLossPercent: 2.5,
      suggestedTakeProfitPercent: 5.0,
      rationale: `Technical analysis for ${pair}: Price at $${price}. ${factors.join('. ')}.${note}`,
      keyTechnicalFactors: factors,
      riskLevel: confidence > 75 ? 'LOW' : 'MEDIUM',
    };
  }
}

export const geminiService = new GeminiService();
