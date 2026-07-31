# 🚀 Kraken Gemini AI Trader (v0.0.8-alpha)

An autonomous AI-powered cryptocurrency trading system operating on **Google Gemini Pro**, integrated directly with **Kraken Exchange**. Features **Paper Trading**, **Real-Money Trading**, a **Strategy Presets Manager**, **Historical Backtesting Engine**, and complete **Docker & Portainer deployment setups**.

---

## 🌟 Key Features

- **🧠 Gemini Pro AI Strategy Engine**:
  - Multi-indicator market analysis (RSI 14, MACD 12/26/9, SMA 20/50/200, Bollinger Bands, Volume Delta).
  - Outputs structured JSON trade signals (`BUY`, `SELL`, `HOLD`, Position Size %, Stop Loss %, Take Profit %, Confidence %, Rationale).
  - Dynamic Google ModelService integration with live model downloader (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro-latest`).

- **🎛️ Strategy Presets & Custom Profiles**:
  - Pre-built templates: **Conservative Trend Follower**, **Gemini Deep Quant (Balanced)**, and **Aggressive Momentum Scalper**.
  - Custom Strategy Builder: Configure AI Personas, custom technical indicator thresholds, and risk rules.
  - Privacy-First Storage: User strategy presets saved locally in `data/strategies.json` (excluded from git via `.gitignore`).

- **📈 Trading & Simulation Engines**:
  - **Kraken REST & Private API**: Real-time price tickers, orderbooks, OHLCV candles, and signed HMAC-SHA512 live orders.
  - **Paper Trading Engine**: Virtual capital simulation ($10,000 USD default) with fee modeling (0.26%), auto-stop loss/take profit triggers, and PnL ledger.
  - **Backtesting Lab**: Tests quantitative strategies on historical Kraken OHLCV candles (15m, 1h, 4h, 1d) with equity curves, Sharpe ratio, win rate %, max drawdown %, and trade logs.

- **🛡️ Safety & Risk Guardrails**:
  - Max position size cap (% per order)
  - Daily loss limit threshold (auto-locks real trading if breached)
  - Require manual confirmation mode toggle
  - **Emergency Panic Kill Switch**: Instant kill switch to halt all live orders.

- **🔍 Provider Diagnostics & Update Checker**:
  - Independent **"Test Gemini Connection"** and **"Test Kraken Connection"** buttons in API Settings.
  - **Live Git Version Checker**: Automatic GitHub update notification badge when new release tags are published.

---

## 🐳 Deployment Guide

### Option 1: Portainer Stack (Recommended for Private Servers)

In Portainer (**Stacks** ➔ **Add stack** ➔ **Web editor**), paste the following configuration:

```yaml
services:
  kraken-gemini-trader:
    build:
      context: https://github.com/cantpauseitmum/kraken-gemini-trader.git#main
    container_name: kraken-gemini-trader
    ports:
      - "8095:3000"
      - "8096:3001"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.0-flash}
      - KRAKEN_API_KEY=${KRAKEN_API_KEY}
      - KRAKEN_API_SECRET=${KRAKEN_API_SECRET}
      - DEFAULT_TRADING_MODE=${DEFAULT_TRADING_MODE:-PAPER}
      - INITIAL_PAPER_BALANCE=${INITIAL_PAPER_BALANCE:-10000}
    volumes:
      - kraken_trader_data:/app/data
    restart: unless-stopped

volumes:
  kraken_trader_data:
```

Add your environment variables under **Environment variables**:
- `GEMINI_API_KEY`: `your_gemini_api_key_here`
- `KRAKEN_API_KEY`: `your_kraken_api_key_here`
- `KRAKEN_API_SECRET`: `your_kraken_api_secret_here`

Click **Deploy the stack**. Access the web dashboard at **`http://YOUR_SERVER_IP:8095`**.

---

### Option 2: Standard Docker Compose

1. **Clone Repository & Configure Environment**:
   ```bash
   git clone https://github.com/cantpauseitmum/kraken-gemini-trader.git
   cd kraken-gemini-trader
   cp .env.example .env
   ```

2. **Edit `.env`**:
   ```env
   GEMINI_API_KEY=your_gemini_pro_api_key
   GEMINI_MODEL=gemini-2.0-flash
   KRAKEN_API_KEY=your_kraken_api_key
   KRAKEN_API_SECRET=your_kraken_api_secret
   HOST_PORT=8095
   API_PORT=8096
   DEFAULT_TRADING_MODE=PAPER
   ```

3. **Build & Run Container**:
   ```bash
   docker compose up -d --build
   ```

---

## 📡 Diagnostic API Endpoints

- `GET /api/health`: Health status & active panic switch check.
- `GET /api/version/check`: Live GitHub release update checker.
- `POST /api/settings/test-gemini`: Gemini API connection test.
- `POST /api/settings/test-kraken`: Kraken API connection test.
- `POST /api/settings/fetch-gemini-models`: Download available Gemini models.

---

## ⚠️ Safety Disclaimer

*Trading cryptocurrencies carries significant financial risk. This software is for educational, research, and algorithmic testing purposes. Always perform backtesting and paper trading before deploying real capital.*
