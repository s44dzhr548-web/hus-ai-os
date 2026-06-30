-- Trading AI time-series schema (Supabase Postgres)
-- Paper trading only for MVP

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  paper_trading_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  symbols TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- OHLCV bars (time-series)
CREATE TABLE IF NOT EXISTS market_bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1Day',
  bar_time TIMESTAMPTZ NOT NULL,
  open NUMERIC(18, 6) NOT NULL,
  high NUMERIC(18, 6) NOT NULL,
  low NUMERIC(18, 6) NOT NULL,
  close NUMERIC(18, 6) NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'alpaca',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, timeframe, bar_time)
);

CREATE INDEX idx_market_bars_symbol_time ON market_bars(symbol, bar_time DESC);

-- Trading signals (auditable)
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short', 'neutral')),
  strength NUMERIC(5, 4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
  price_at_signal NUMERIC(18, 6) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_symbol ON signals(symbol, created_at DESC);
CREATE INDEX idx_signals_user ON signals(user_id, created_at DESC);

-- Paper trading ledger
CREATE TABLE IF NOT EXISTS paper_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  cash_balance NUMERIC(18, 2) NOT NULL DEFAULT 100000.00,
  equity NUMERIC(18, 2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC(18, 6) NOT NULL,
  avg_entry_price NUMERIC(18, 6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, symbol)
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(18, 6) NOT NULL,
  price NUMERIC(18, 6) NOT NULL,
  signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paper_trades_account ON paper_trades(account_id, created_at DESC);

-- Backtest runs (reproducibility)
CREATE TABLE IF NOT EXISTS backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  strategy TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital NUMERIC(18, 2) NOT NULL,
  final_equity NUMERIC(18, 2),
  total_return_pct NUMERIC(10, 6),
  max_drawdown_pct NUMERIC(10, 6),
  params JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profile trigger
CREATE OR REPLACE FUNCTION handle_trading_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO paper_accounts (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_trading_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_trading_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY watchlists_own ON watchlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY market_bars_read ON market_bars FOR SELECT USING (TRUE);
CREATE POLICY signals_own ON signals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY paper_accounts_own ON paper_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY paper_positions_own ON paper_positions FOR ALL
  USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY paper_trades_own ON paper_trades FOR ALL
  USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY backtest_runs_own ON backtest_runs FOR ALL USING (auth.uid() = user_id);
