-- Global auto paper bot runtime state (single-tenant MVP)
CREATE TABLE IF NOT EXISTS bot_runtime_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_stop BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  trades_today INT NOT NULL DEFAULT 0,
  trades_day_key TEXT NOT NULL DEFAULT '',
  last_scanned_symbols TEXT[] NOT NULL DEFAULT '{}',
  last_trade JSONB,
  last_error TEXT,
  consecutive_errors INT NOT NULL DEFAULT 0,
  activity_log JSONB NOT NULL DEFAULT '[]',
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bot_runtime_state (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
