import { storage, TradePosition, ThoughtLog } from './storageService.js';
import { krakenService } from './krakenService.js';
import { geminiService, GeminiTradeDecision } from './geminiService.js';

export class PaperTradingEngine {
  /**
   * Execute paper trade recommendation
   */
  async executeSignal(
    pair: string,
    decision: GeminiTradeDecision,
    currentPrice: number
  ): Promise<TradePosition | null> {
    const settings = storage.getSettings();
    const positions = storage.getPositions();

    if (decision.action === 'HOLD') {
      return null;
    }

    // Check open positions for this pair
    const openPos = positions.find((p) => p.pair === pair && p.type === 'PAPER' && p.status === 'OPEN');

    // If BUY signal and already open BUY, or SELL signal and open position
    if (openPos) {
      if (openPos.side === decision.action) {
        console.log(`Paper engine: Position already open for ${pair} (${openPos.side})`);
        return null;
      } else {
        // Opposite signal: close existing position
        this.closePosition(openPos.id, currentPrice, 'Closed by opposite AI signal');
      }
    }

    if (decision.action === 'BUY') {
      const balance = settings.paperBalanceUSD;
      const sizePercent = Math.min(decision.recommendedPositionSizePercent || 10, settings.riskManagement.maxPositionSizePercent);
      const allocatedUSD = (balance * sizePercent) / 100;

      if (allocatedUSD < 10) {
        console.warn('Paper trading: Insufficient USD balance to place trade');
        return null;
      }

      // Apply 0.26% fee
      const feeUSD = allocatedUSD * 0.0026;
      const netUSD = allocatedUSD - feeUSD;
      const amount = netUSD / currentPrice;

      const stopLossPrice = currentPrice * (1 - (decision.suggestedStopLossPercent || 2.5) / 100);
      const takeProfitPrice = currentPrice * (1 + (decision.suggestedTakeProfitPercent || 5.0) / 100);

      const newPos: TradePosition = {
        id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        pair,
        side: 'BUY',
        type: 'PAPER',
        entryPrice: currentPrice,
        amount,
        valueUSD: allocatedUSD,
        stopLoss: Math.round(stopLossPrice * 100) / 100,
        takeProfit: Math.round(takeProfitPrice * 100) / 100,
        timestamp: new Date().toISOString(),
        status: 'OPEN',
        geminiReasoning: decision.rationale,
        geminiConfidence: decision.confidence,
      };

      // Deduct balance
      storage.saveSettings({ paperBalanceUSD: balance - allocatedUSD });
      storage.addPosition(newPos);
      return newPos;
    }

    return null;
  }

  /**
   * Monitor open paper positions for Stop Loss & Take Profit targets
   */
  async updateOpenPositions(currentPriceMap: Record<string, number>): Promise<void> {
    const positions = storage.getPositions();
    const openPositions = positions.filter((p) => p.type === 'PAPER' && p.status === 'OPEN');

    for (const pos of openPositions) {
      const price = currentPriceMap[pos.pair];
      if (!price) continue;

      if (pos.side === 'BUY') {
        // Stop Loss triggered
        if (price <= pos.stopLoss) {
          this.closePosition(pos.id, price, 'Stop Loss Triggered');
        }
        // Take Profit triggered
        else if (price >= pos.takeProfit) {
          this.closePosition(pos.id, price, 'Take Profit Triggered');
        }
      }
    }
  }

  /**
   * Close paper position
   */
  closePosition(positionId: string, closePrice: number, reason?: string): TradePosition | null {
    const positions = storage.getPositions();
    const pos = positions.find((p) => p.id === positionId);
    if (!pos || pos.status !== 'OPEN') return null;

    const returnUSD = pos.amount * closePrice;
    const fee = returnUSD * 0.0026;
    const netReturnUSD = returnUSD - fee;
    const pnlUSD = netReturnUSD - pos.valueUSD;
    const pnlPercent = (pnlUSD / pos.valueUSD) * 100;

    const settings = storage.getSettings();
    storage.saveSettings({ paperBalanceUSD: settings.paperBalanceUSD + netReturnUSD });

    const updated = storage.updatePosition(positionId, {
      status: 'CLOSED',
      closePrice,
      closeTimestamp: new Date().toISOString(),
      pnlUSD: Math.round(pnlUSD * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
    });

    console.log(`Paper trade closed [${pos.pair}]: PnL $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%) - ${reason || ''}`);
    return updated;
  }
}

export const paperTradingEngine = new PaperTradingEngine();
