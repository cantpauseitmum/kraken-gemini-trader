import { krakenService } from './krakenService.js';
import { storage, TradePosition } from './storageService.js';
import { GeminiTradeDecision } from './geminiService.js';

export class LiveTradingEngine {
  private panicStopEnabled = false;

  public setPanicStop(enabled: boolean) {
    this.panicStopEnabled = enabled;
    console.warn(`[SAFETY ALERT] Emergency Panic Switch ${enabled ? 'ACTIVATED' : 'Deactivated'}`);
  }

  public isPanicStopActive(): boolean {
    return this.panicStopEnabled;
  }

  async executeLiveSignal(
    pair: string,
    decision: GeminiTradeDecision,
    currentPrice: number
  ): Promise<TradePosition | null> {
    const settings = storage.getSettings();

    if (this.panicStopEnabled) {
      throw new Error('Real money trade blocked: Panic switch is currently active.');
    }

    if (settings.tradingMode !== 'REAL') {
      throw new Error('System is not in REAL trading mode.');
    }

    if (!settings.krakenApiKey || !settings.krakenApiSecret) {
      throw new Error('Kraken API Key and Secret are not configured in settings.');
    }

    if (decision.action === 'HOLD') {
      return null;
    }

    if (settings.riskManagement.requireManualConfirmation) {
      console.log(`[REAL MONEY] Trade requires manual user confirmation in UI: ${decision.action} ${pair}`);
    }

    // Safety checks: daily loss limit check
    const todayStr = new Date().toISOString().split('T')[0];
    const positions = storage.getPositions();
    const todayTrades = positions.filter((p) => p.type === 'REAL' && p.closeTimestamp?.startsWith(todayStr));
    const todayPnL = todayTrades.reduce((acc, p) => acc + (p.pnlUSD || 0), 0);

    if (todayPnL < -Math.abs(settings.riskManagement.dailyLossLimitUSD)) {
      throw new Error(`Daily loss limit reached (-$${Math.abs(todayPnL).toFixed(2)}). Real trading suspended.`);
    }

    if (decision.action === 'BUY') {
      // Calculate order volume
      const maxUSD = 500; // Hard max per trade safety default
      const allocUSD = Math.min(maxUSD, (10000 * settings.riskManagement.maxPositionSizePercent) / 100);
      const volume = (allocUSD / currentPrice).toFixed(6);

      console.log(`[REAL ORDER] Submitting BUY to Kraken for ${pair}: Volume ${volume} @ Market (~$${currentPrice})`);

      try {
        const res = await krakenService.placeOrder(
          settings.krakenApiKey,
          settings.krakenApiSecret,
          pair,
          'buy',
          'market',
          volume
        );

        const newPos: TradePosition = {
          id: `real_${Date.now()}_${res.txid ? res.txid[0] : 'order'}`,
          pair,
          side: 'BUY',
          type: 'REAL',
          entryPrice: currentPrice,
          amount: parseFloat(volume),
          valueUSD: allocUSD,
          stopLoss: currentPrice * (1 - (decision.suggestedStopLossPercent || 2.5) / 100),
          takeProfit: currentPrice * (1 + (decision.suggestedTakeProfitPercent || 5.0) / 100),
          timestamp: new Date().toISOString(),
          status: 'OPEN',
          geminiReasoning: decision.rationale,
          geminiConfidence: decision.confidence,
        };

        storage.addPosition(newPos);

        // Log real trade execution event
        storage.addThought({
          id: `live_${Date.now()}`,
          timestamp: new Date().toISOString(),
          pair,
          action: 'BUY',
          confidence: decision.confidence,
          price: currentPrice,
          reasoning: `REAL KRAKEN ORDER PLACED: Executed live market BUY for ${volume} ${pair} @ $${currentPrice.toLocaleString()} (TXID: ${res.txid ? res.txid.join(', ') : 'OK'}).`,
          technicalIndicators: {},
          riskLevel: decision.riskLevel,
          mode: 'REAL',
          logType: 'ORDER',
        });

        return newPos;
      } catch (err: any) {
        console.error('Kraken Live Execution Failed:', err.message);
        throw err;
      }
    }

    return null;
  }
}

export const liveTradingEngine = new LiveTradingEngine();
