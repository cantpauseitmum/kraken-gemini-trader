import { krakenService, OHLCV } from './krakenService.js';
import { geminiService, TechnicalIndicators, GeminiTradeDecision } from './geminiService.js';
import { storage, BacktestResult, TradePosition } from './storageService.js';

export interface BacktestOptions {
  pair: string;
  timeframeIntervalMinutes: number; // 5, 15, 60, 240, 1440
  initialBalance: number;
  useAiEvaluations: boolean; // Fast technical mode vs AI mode
}

export class BacktestEngine {
  async runBacktest(options: BacktestOptions): Promise<BacktestResult> {
    const { pair, timeframeIntervalMinutes, initialBalance, useAiEvaluations } = options;

    console.log(`Starting backtest for ${pair} (${timeframeIntervalMinutes}m candles, initial $${initialBalance})...`);

    // Fetch historical candles from Kraken
    const candles = await krakenService.getOHLCV(pair, timeframeIntervalMinutes);
    if (!candles || candles.length < 30) {
      throw new Error(`Insufficient historical candle data for ${pair}`);
    }

    let currentBalance = initialBalance;
    const trades: TradePosition[] = [];
    const equityCurve: { time: string; balance: number }[] = [];
    let openPosition: TradePosition | null = null;
    let peakBalance = initialBalance;
    let maxDrawdownUSD = 0;

    const startDate = new Date(candles[0].time * 1000).toISOString();
    const endDate = new Date(candles[candles.length - 1].time * 1000).toISOString();

    // Step through candles starting from index 30 to allow indicator warmup
    for (let i = 30; i < candles.length; i++) {
      const window = candles.slice(0, i + 1);
      const currentCandle = candles[i];
      const currentPrice = currentCandle.close;
      const timestamp = new Date(currentCandle.time * 1000).toISOString();

      const indicators = geminiService.computeIndicators(window);

      // Evaluate Stop Loss / Take Profit if open position exists
      if (openPosition && openPosition.status === 'OPEN') {
        let closed = false;
        let exitPrice = currentPrice;
        let exitReason = '';

        if (openPosition.side === 'BUY') {
          if (currentCandle.low <= openPosition.stopLoss) {
            closed = true;
            exitPrice = openPosition.stopLoss;
            exitReason = 'Stop Loss Hit';
          } else if (currentCandle.high >= openPosition.takeProfit) {
            closed = true;
            exitPrice = openPosition.takeProfit;
            exitReason = 'Take Profit Hit';
          }
        }

        if (closed) {
          const returnUSD = openPosition.amount * exitPrice;
          const fee = returnUSD * 0.0026;
          const netReturn = returnUSD - fee;
          const pnlUSD = netReturn - openPosition.valueUSD;
          const pnlPercent = (pnlUSD / openPosition.valueUSD) * 100;

          currentBalance += netReturn;
          openPosition.status = 'CLOSED';
          openPosition.closePrice = exitPrice;
          openPosition.closeTimestamp = timestamp;
          openPosition.pnlUSD = Math.round(pnlUSD * 100) / 100;
          openPosition.pnlPercent = Math.round(pnlPercent * 100) / 100;

          trades.push({ ...openPosition });
          openPosition = null;
        }
      }

      // Generate trade decision for new entries
      if (!openPosition) {
        let decision: GeminiTradeDecision;

        if (useAiEvaluations && i % 10 === 0) { // Sample every 10 candles for AI speed
          const mockTicker = {
            pair,
            ask: currentPrice * 1.0001,
            bid: currentPrice * 0.9999,
            last: currentPrice,
            volume24h: currentCandle.volume,
            vwap24h: currentCandle.vwap,
            low24h: currentCandle.low,
            high24h: currentCandle.high,
            open24h: currentCandle.open,
          };
          const res = await geminiService.analyzeMarket(pair, mockTicker, window);
          decision = res.decision;
        } else {
          // Rule-based quantitative signal evaluation
          decision = this.evaluateTechnicalSignal(indicators, currentPrice);
        }

        if (decision.action === 'BUY' && currentBalance >= 50) {
          const allocUSD = currentBalance * 0.15; // 15% position size per trade
          const feeUSD = allocUSD * 0.0026;
          const netUSD = allocUSD - feeUSD;
          const amount = netUSD / currentPrice;

          currentBalance -= allocUSD;

          openPosition = {
            id: `bt_${i}_${Date.now()}`,
            pair,
            side: 'BUY',
            type: 'PAPER',
            entryPrice: currentPrice,
            amount,
            valueUSD: allocUSD,
            stopLoss: Math.round(currentPrice * (1 - (decision.suggestedStopLossPercent || 2.5) / 100) * 100) / 100,
            takeProfit: Math.round(currentPrice * (1 + (decision.suggestedTakeProfitPercent || 5.0) / 100) * 100) / 100,
            timestamp,
            status: 'OPEN',
            geminiReasoning: decision.rationale,
            geminiConfidence: decision.confidence,
          };
        }
      }

      // Calculate portfolio equity
      const positionValue = openPosition ? openPosition.amount * currentPrice : 0;
      const totalEquity = currentBalance + positionValue;

      if (totalEquity > peakBalance) {
        peakBalance = totalEquity;
      }
      const drawdown = peakBalance - totalEquity;
      if (drawdown > maxDrawdownUSD) {
        maxDrawdownUSD = drawdown;
      }

      equityCurve.push({
        time: timestamp.split('T')[0] + ' ' + timestamp.split('T')[1].substring(0, 5),
        balance: Math.round(totalEquity * 100) / 100,
      });
    }

    // Force close open position at end of simulation
    if (openPosition) {
      const lastPrice = candles[candles.length - 1].close;
      const returnUSD = openPosition.amount * lastPrice;
      const netReturn = returnUSD * (1 - 0.0026);
      const pnlUSD = netReturn - openPosition.valueUSD;

      currentBalance += netReturn;
      openPosition.status = 'CLOSED';
      openPosition.closePrice = lastPrice;
      openPosition.pnlUSD = Math.round(pnlUSD * 100) / 100;
      openPosition.pnlPercent = Math.round((pnlUSD / openPosition.valueUSD) * 10000) / 100;
      trades.push({ ...openPosition });
    }

    // Calculate final metrics
    const winningTrades = trades.filter((t) => (t.pnlUSD || 0) > 0).length;
    const losingTrades = trades.filter((t) => (t.pnlUSD || 0) <= 0).length;
    const totalTrades = trades.length;
    const winRatePercent = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalReturnPercent = ((currentBalance - initialBalance) / initialBalance) * 100;
    const maxDrawdownPercent = peakBalance > 0 ? (maxDrawdownUSD / peakBalance) * 100 : 0;

    // Sharpe Ratio calculation (simplistic estimate based on trade returns)
    const returns = trades.map((t) => (t.pnlPercent || 0) / 100);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length - 1))
      : 0.01;
    const sharpeRatio = stdDev !== 0 ? Math.round(((avgReturn - 0.0001) / stdDev) * 100) / 100 : 0;

    const result: BacktestResult = {
      id: `bt_run_${Date.now()}`,
      pair,
      timeframe: `${timeframeIntervalMinutes}m`,
      startDate,
      endDate,
      initialBalance,
      finalBalance: Math.round(currentBalance * 100) / 100,
      totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
      winRatePercent: Math.round(winRatePercent * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades,
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      sharpeRatio,
      trades,
      equityCurve,
      timestamp: new Date().toISOString(),
    };

    storage.saveBacktestResult(result);
    return result;
  }

  private evaluateTechnicalSignal(ind: TechnicalIndicators, price: number): GeminiTradeDecision {
    if (ind.rsi14 < 35 && ind.macd.histogram > 0) {
      return {
        action: 'BUY',
        confidence: 75,
        recommendedPositionSizePercent: 15,
        suggestedStopLossPercent: 2.5,
        suggestedTakeProfitPercent: 5.0,
        rationale: 'Backtest quantitative buy signal: RSI oversold recovery with positive MACD momentum.',
        keyTechnicalFactors: ['RSI < 35', 'MACD positive histogram'],
        riskLevel: 'LOW',
      };
    } else if (ind.rsi14 > 65 || ind.macd.histogram < -5) {
      return {
        action: 'SELL',
        confidence: 70,
        recommendedPositionSizePercent: 15,
        suggestedStopLossPercent: 2.5,
        suggestedTakeProfitPercent: 5.0,
        rationale: 'Backtest sell signal: RSI overbought or MACD deceleration.',
        keyTechnicalFactors: ['RSI > 65', 'MACD negative histogram'],
        riskLevel: 'MEDIUM',
      };
    }

    return {
      action: 'HOLD',
      confidence: 50,
      recommendedPositionSizePercent: 0,
      suggestedStopLossPercent: 2.5,
      suggestedTakeProfitPercent: 5.0,
      rationale: 'Consolidation zone. Holding position.',
      keyTechnicalFactors: ['RSI neutral'],
      riskLevel: 'LOW',
    };
  }
}

export const backtestEngine = new BacktestEngine();
