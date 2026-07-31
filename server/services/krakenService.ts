import crypto from 'crypto';

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

export class KrakenService {
  private baseUrl = 'https://api.kraken.com';

  /**
   * Helper to normalize trading pair names (e.g. BTCUSD -> XBTUSD)
   */
  public normalizePairName(pair: string): string {
    const p = pair.toUpperCase().replace('/', '').replace('-', '');
    if (p === 'BTCUSD' || p === 'BTC/USD') return 'XBTUSD';
    if (p === 'ETHUSD' || p === 'ETH/USD') return 'ETHUSD';
    if (p === 'SOLUSD' || p === 'SOL/USD') return 'SOLUSD';
    return p;
  }

  /**
   * Fetch live ticker for a pair
   */
  async getTicker(pair = 'XBTUSD'): Promise<KrakenTicker> {
    const normalized = this.normalizePairName(pair);
    try {
      const res = await fetch(`${this.baseUrl}/0/public/Ticker?pair=${normalized}`);
      const data = await res.json();
      
      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      const keys = Object.keys(data.result);
      if (keys.length === 0) throw new Error(`No ticker data returned for ${normalized}`);

      const t = data.result[keys[0]];
      return {
        pair: normalized,
        ask: parseFloat(t.a[0]),
        bid: parseFloat(t.b[0]),
        last: parseFloat(t.c[0]),
        volume24h: parseFloat(t.v[1]),
        vwap24h: parseFloat(t.p[1]),
        low24h: parseFloat(t.l[1]),
        high24h: parseFloat(t.h[1]),
        open24h: parseFloat(t.o),
      };
    } catch (e: any) {
      console.warn(`Kraken API fallback for ticker ${pair}:`, e.message);
      // Fallback mock data if API rate-limited or offline during development
      return {
        pair: normalized,
        ask: 64250.50,
        bid: 64245.00,
        last: 64248.20,
        volume24h: 1245.8,
        vwap24h: 63890.10,
        low24h: 62800.00,
        high24h: 64900.00,
        open24h: 63100.00,
      };
    }
  }

  /**
   * Fetch OHLC historical candles
   * interval: 1, 5, 15, 30, 60, 240, 1440
   */
  async getOHLCV(pair = 'XBTUSD', interval = 60, since?: number): Promise<OHLCV[]> {
    const normalized = this.normalizePairName(pair);
    let url = `${this.baseUrl}/0/public/OHLC?pair=${normalized}&interval=${interval}`;
    if (since) url += `&since=${since}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      const keys = Object.keys(data.result).filter((k) => k !== 'last');
      if (keys.length === 0) return [];

      const rawCandles = data.result[keys[0]];
      return rawCandles.map((c: any) => ({
        time: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        vwap: parseFloat(c[5]),
        volume: parseFloat(c[6]),
        count: parseInt(c[7]),
      }));
    } catch (e: any) {
      console.warn(`Kraken API OHLC error for ${pair}, using fallback synthetic generator:`, e.message);
      return this.generateSyntheticOHLCV(interval, 100);
    }
  }

  /**
   * Generate synthetic candles fallback if market API is restricted or rate limited
   */
  private generateSyntheticOHLCV(intervalMinutes: number, count: number): OHLCV[] {
    const candles: OHLCV[] = [];
    let now = Math.floor(Date.now() / 1000);
    let currentPrice = 64000;
    const stepSeconds = intervalMinutes * 60;

    for (let i = count - 1; i >= 0; i--) {
      const time = now - i * stepSeconds;
      const change = (Math.random() - 0.49) * (currentPrice * 0.008);
      const open = currentPrice;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 80;
      const low = Math.min(open, close) - Math.random() * 80;
      const volume = Math.random() * 15 + 2;

      candles.push({
        time,
        open,
        high,
        low,
        close,
        vwap: (open + close) / 2,
        volume,
        count: Math.floor(Math.random() * 200 + 50),
      });

      currentPrice = close;
    }
    return candles;
  }

  /**
   * Private API signature helper
   */
  private getMessageSignature(path: string, requestData: Record<string, any>, secret: string): string {
    const postData = new URLSearchParams(requestData).toString();
    const nonce = requestData.nonce;
    const message = nonce + postData;

    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(secret, 'base64'));
    hmac.update(path);
    hmac.update(hash);

    return hmac.digest('base64');
  }

  /**
   * Fetch private account balances (Requires API key + Secret)
   */
  async getAccountBalances(apiKey: string, apiSecret: string): Promise<Record<string, number>> {
    if (!apiKey || !apiSecret) {
      throw new Error('Kraken API key and Secret are required for private account operations.');
    }

    const path = '/0/private/Balance';
    const nonce = Date.now().toString();
    const postData = { nonce };
    const signature = this.getMessageSignature(path, postData, apiSecret);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(postData).toString(),
    });

    const data = await res.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const balances: Record<string, number> = {};
    for (const [key, val] of Object.entries(data.result || {})) {
      balances[key] = parseFloat(val as string);
    }
    return balances;
  }

  /**
   * Execute real trade order on Kraken (Requires API Key + Secret)
   */
  async placeOrder(
    apiKey: string,
    apiSecret: string,
    pair: string,
    side: 'buy' | 'sell',
    ordertype: 'market' | 'limit',
    volume: string,
    price?: string
  ): Promise<any> {
    if (!apiKey || !apiSecret) {
      throw new Error('Kraken API key and Secret are required to place real orders.');
    }

    const path = '/0/private/AddOrder';
    const nonce = Date.now().toString();
    const postData: Record<string, string> = {
      nonce,
      ordertype,
      type: side,
      volume,
      pair: this.normalizePairName(pair),
    };
    if (ordertype === 'limit' && price) {
      postData.price = price;
    }

    const signature = this.getMessageSignature(path, postData, apiSecret);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(postData).toString(),
    });

    const data = await res.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken Order Error: ${data.error.join(', ')}`);
    }

    return data.result;
  }

  /**
   * Fetch open positions directly from Kraken (Requires API Key + Secret)
   */
  async getOpenPositions(apiKey: string, apiSecret: string): Promise<any[]> {
    if (!apiKey || !apiSecret) return [];
    try {
      const path = '/0/private/OpenPositions';
      const nonce = Date.now().toString();
      const postData = { nonce };
      const signature = this.getMessageSignature(path, postData, apiSecret);

      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData).toString(),
      });

      const data = await res.json();
      if (data.error && data.error.length > 0) {
        console.warn('Kraken OpenPositions API warning:', data.error.join(', '));
        return [];
      }

      const result = data.result || {};
      return Object.entries(result).map(([txid, pos]: [string, any]) => ({
        id: txid,
        pair: pos.pair || 'XBTUSD',
        side: pos.type === 'buy' ? 'BUY' : 'SELL',
        entryPrice: parseFloat(pos.cost) / (parseFloat(pos.vol) || 1),
        currentPrice: parseFloat(pos.cost) / (parseFloat(pos.vol) || 1),
        amount: parseFloat(pos.vol),
        valueUSD: parseFloat(pos.cost),
        timestamp: Math.floor(parseFloat(pos.time) * 1000),
        status: 'OPEN',
        pnlUSD: parseFloat(pos.net || '0'),
        pnlPercent: 0,
      }));
    } catch (e: any) {
      console.warn('Error fetching Kraken OpenPositions:', e.message);
      return [];
    }
  }

  /**
   * Fetch trades history directly from Kraken (Requires API Key + Secret)
   */
  async getTradesHistory(apiKey: string, apiSecret: string): Promise<any[]> {
    if (!apiKey || !apiSecret) return [];
    try {
      const path = '/0/private/TradesHistory';
      const nonce = Date.now().toString();
      const postData = { nonce };
      const signature = this.getMessageSignature(path, postData, apiSecret);

      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData).toString(),
      });

      const data = await res.json();
      if (data.error && data.error.length > 0) {
        console.warn('Kraken TradesHistory API warning:', data.error.join(', '));
        return [];
      }

      const trades = data.result?.trades || {};
      return Object.entries(trades).slice(0, 20).map(([txid, trade]: [string, any]) => ({
        id: txid,
        pair: trade.pair || 'XBTUSD',
        side: trade.type === 'buy' ? 'BUY' : 'SELL',
        entryPrice: parseFloat(trade.price),
        currentPrice: parseFloat(trade.price),
        amount: parseFloat(trade.vol),
        valueUSD: parseFloat(trade.cost),
        timestamp: Math.floor(parseFloat(trade.time) * 1000),
        status: 'CLOSED',
        pnlUSD: 0,
        pnlPercent: 0,
        reason: 'Executed on Kraken',
      }));
    } catch (e: any) {
      console.warn('Error fetching Kraken TradesHistory:', e.message);
      return [];
    }
  }

  /**
   * Test connection to Kraken API (Public ticker & optional private balance)
   */
  async testConnection(apiKey?: string, apiSecret?: string): Promise<{ success: boolean; message: string; balances?: Record<string, number> }> {
    try {
      // 1. Test public API first
      const serverTimeRes = await fetch(`${this.baseUrl}/0/public/Time`);
      const serverTimeData = await serverTimeRes.json();
      if (serverTimeData.error && serverTimeData.error.length > 0) {
        return { success: false, message: `Kraken Public API Error: ${serverTimeData.error.join(', ')}` };
      }

      // If no private keys supplied, report public success
      if (!apiKey || !apiSecret || apiKey.trim() === '' || apiSecret.trim() === '') {
        return {
          success: true,
          message: 'Kraken Public Market API connected successfully! (Private keys not set for live trading).',
        };
      }

      // 2. Test private authenticated balance query
      const balances = await this.getAccountBalances(apiKey, apiSecret);
      const balanceKeys = Object.keys(balances);
      return {
        success: true,
        message: `Kraken Private API authenticated! Found ${balanceKeys.length} assets in account balances.`,
        balances,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Kraken API Authentication Error: ${err.message}`,
      };
    }
  }
}

export const krakenService = new KrakenService();
