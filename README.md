# 🚀 Kraken Gemini AI Trader

An autonomous AI-powered cryptocurrency trading system operating on **Google Gemini Pro**, integrated directly with **Kraken Exchange**. Features **Paper Trading**, **Real-Money Trading**, a **Historical Backtesting Engine**, and a complete **Docker containerization setup**.

---

## 🌟 Key Features

- **🧠 Gemini Pro AI Strategy Engine**:
  - Multi-indicator market evaluation (RSI 14, MACD 12/26/9, SMA 20/50/200, Bollinger Bands, Volume Delta).
  - Generates structured JSON trade recommendations (`BUY`, `SELL`, `HOLD`, Position Size %, Stop Loss %, Take Profit %, Confidence %, Rationale).
  - Dynamic Google ModelService integration with live model downloader (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro-latest`).

- **📈 Exchange & Simulation Engines**:
  - **Kraken REST & Private API**: Fetches real-time ticker data, orderbooks, OHLCV candles, and executes signed HMAC-SHA512 live orders.
  - **Paper Trading Engine**: Virtual capital simulation ($10,000 USD default) with realistic maker/taker fee modeling (0.26%), auto-stop loss/take profit triggers, and PnL ledger.
  - **Backtesting Lab**: Tests quantitative AI strategies on historical Kraken OHLCV candles (15m, 1h, 4h, 1d) with equity curves, Sharpe ratio, win rate %, max drawdown %, and trade logs.

- **🛡️ Safety & Risk Guardrails**:
  - Max position size cap (% per order)
  - Daily loss limit auto-lock
  - Require manual confirmation mode toggle
  - **Emergency Panic Kill Switch**: Instant kill switch to halt all live orders.

- **🐳 Docker Containerized**:
  - Multi-stage `Dockerfile` and `docker-compose.yml` for single-command launch.
  - Volume persistence (`./data`) for local trade history, settings, and backtest runs.

---

## 🛠️ Quickstart with Docker

### 1. Clone & Configure Environment

```bash
git clone https://github.com/cantpauseitmum/kraken-gemini-trader.git
cd kraken-gemini-trader
```

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your API credentials:

```env
GEMINI_API_KEY=your_gemini_pro_api_key
GEMINI_MODEL=gemini-2.0-flash
KRAKEN_API_KEY=your_kraken_api_key
KRAKEN_API_SECRET=your_kraken_api_secret
PORT=3001
DEFAULT_TRADING_MODE=PAPER
```

### 2. Launch with Docker Compose

```bash
docker compose up -d --build
```

Access the interactive web dashboard at:
👉 **[http://localhost:3000](http://localhost:3000)** or **[http://localhost:3001](http://localhost:3001)**

---

## 📡 API Diagnostics & Testing

The system includes built-in provider diagnostic endpoints:
- **Test Gemini API**: `POST /api/settings/test-gemini`
- **Test Kraken API**: `POST /api/settings/test-kraken`
- **Fetch Live Models**: `POST /api/settings/fetch-gemini-models`

---

## ⚠️ Disclaimer

*Trading cryptocurrencies carries significant financial risk. This tool is provided for educational and experimental purposes. Always backtest strategies and start with Paper Trading mode before committing real funds.*
