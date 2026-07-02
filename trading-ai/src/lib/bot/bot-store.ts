import fs from "fs";
import path from "path";
import type { BotActivityLog } from "@/types/trading";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const BOT_SCHEDULE_MINUTES = 5;
export const BOT_MAX_TRADES_PER_DAY = 5;
export const BOT_MAX_CONSECUTIVE_ERRORS = 10;
export const BOT_LOCK_MINUTES = 4;

export type BotStorageBackend = "supabase" | "file" | "memory";

export type PersistedBotTrade = {
  symbol: string;
  side: string;
  at: string;
};

export type PersistedBotState = {
  enabled: boolean;
  paused: boolean;
  emergencyStop: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  tradesToday: number;
  tradesDayKey: string;
  lastScannedSymbols: string[];
  lastTrade?: PersistedBotTrade;
  lastError?: string;
  consecutiveErrors: number;
  activityLog: BotActivityLog[];
  lockedUntil?: string;
};

const DEFAULT_STATE: PersistedBotState = {
  enabled: true,
  paused: false,
  emergencyStop: false,
  tradesToday: 0,
  tradesDayKey: new Date().toISOString().slice(0, 10),
  lastScannedSymbols: [],
  consecutiveErrors: 0,
  activityLog: [],
};

const STATE_FILE = path.join(process.cwd(), "data", "bot-state.json");

declare global {
  // eslint-disable-next-line no-var
  var __botStateCache: PersistedBotState | undefined;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeNextRun(lastRunAt?: string): string {
  const base = lastRunAt ? new Date(lastRunAt).getTime() : Date.now();
  return new Date(base + BOT_SCHEDULE_MINUTES * 60_000).toISOString();
}

export function normalizeBotState(raw: Partial<PersistedBotState>): PersistedBotState {
  const key = todayKey();
  const tradesDayKey = raw.tradesDayKey ?? key;
  return {
    ...DEFAULT_STATE,
    ...raw,
    tradesDayKey,
    tradesToday: tradesDayKey === key ? (raw.tradesToday ?? 0) : 0,
    activityLog: Array.isArray(raw.activityLog) ? raw.activityLog.slice(0, 100) : [],
    lastScannedSymbols: Array.isArray(raw.lastScannedSymbols) ? raw.lastScannedSymbols : [],
  };
}

function readFileState(): PersistedBotState | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    return normalizeBotState(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
  } catch {
    return null;
  }
}

function writeFileState(state: PersistedBotState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function rowToState(row: Record<string, unknown>): PersistedBotState {
  return normalizeBotState({
    enabled: Boolean(row.enabled),
    paused: Boolean(row.paused),
    emergencyStop: Boolean(row.emergency_stop),
    lastRunAt: row.last_run_at ? String(row.last_run_at) : undefined,
    nextRunAt: row.next_run_at ? String(row.next_run_at) : undefined,
    tradesToday: Number(row.trades_today ?? 0),
    tradesDayKey: String(row.trades_day_key ?? todayKey()),
    lastScannedSymbols: (row.last_scanned_symbols as string[]) ?? [],
    lastTrade: row.last_trade as PersistedBotTrade | undefined,
    lastError: row.last_error ? String(row.last_error) : undefined,
    consecutiveErrors: Number(row.consecutive_errors ?? 0),
    activityLog: (row.activity_log as BotActivityLog[]) ?? [],
    lockedUntil: row.locked_until ? String(row.locked_until) : undefined,
  });
}

function stateToRow(state: PersistedBotState): Record<string, unknown> {
  return {
    id: "global",
    enabled: state.enabled,
    paused: state.paused,
    emergency_stop: state.emergencyStop,
    last_run_at: state.lastRunAt ?? null,
    next_run_at: state.nextRunAt ?? computeNextRun(state.lastRunAt),
    trades_today: state.tradesToday,
    trades_day_key: state.tradesDayKey,
    last_scanned_symbols: state.lastScannedSymbols,
    last_trade: state.lastTrade ?? null,
    last_error: state.lastError ?? null,
    consecutive_errors: state.consecutiveErrors,
    activity_log: state.activityLog,
    locked_until: state.lockedUntil ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function loadFromSupabase(): Promise<PersistedBotState | null> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    const { data, error } = await supabase.from("bot_runtime_state").select("*").eq("id", "global").maybeSingle();
    if (error || !data) return null;
    return rowToState(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

async function saveToSupabase(state: PersistedBotState): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    const { error } = await supabase.from("bot_runtime_state").upsert(stateToRow(state));
    return !error;
  } catch {
    return false;
  }
}

export function getStorageBackend(): BotStorageBackend {
  if (isSupabaseConfigured()) return "supabase";
  if (process.env.NODE_ENV === "test" || process.env.VERCEL) return "memory";
  try {
    if (fs.existsSync(path.dirname(STATE_FILE))) return "file";
  } catch {
    /* read-only FS */
  }
  return "memory";
}

export async function loadBotState(): Promise<PersistedBotState> {
  if (globalThis.__botStateCache) {
    return normalizeBotState(globalThis.__botStateCache);
  }

  const supabaseState = await loadFromSupabase();
  if (supabaseState) {
    globalThis.__botStateCache = supabaseState;
    return supabaseState;
  }

  const fileState = readFileState();
  if (fileState) {
    globalThis.__botStateCache = fileState;
    return fileState;
  }

  globalThis.__botStateCache = { ...DEFAULT_STATE, nextRunAt: computeNextRun() };
  return globalThis.__botStateCache;
}

export async function saveBotState(partial: Partial<PersistedBotState>): Promise<PersistedBotState> {
  const current = await loadBotState();
  const next = normalizeBotState({ ...current, ...partial });
  if (!next.nextRunAt) next.nextRunAt = computeNextRun(next.lastRunAt);
  globalThis.__botStateCache = next;

  await saveToSupabase(next);
  if (getStorageBackend() === "file" || process.env.NODE_ENV === "development") {
    try {
      writeFileState(next);
    } catch {
      /* ignore on read-only FS */
    }
  }
  return next;
}

export async function appendBotActivity(entry: Omit<BotActivityLog, "id" | "at">): Promise<BotActivityLog> {
  const row: BotActivityLog = {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...entry,
  };
  const state = await loadBotState();
  const activityLog = [row, ...state.activityLog].slice(0, 100);
  await saveBotState({ activityLog });
  return row;
}

export async function acquireBotLock(): Promise<boolean> {
  const state = await loadBotState();
  if (state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now()) {
    return false;
  }
  await saveBotState({
    lockedUntil: new Date(Date.now() + BOT_LOCK_MINUTES * 60_000).toISOString(),
  });
  return true;
}

export async function releaseBotLock(): Promise<void> {
  const state = await loadBotState();
  await saveBotState({ ...state, lockedUntil: undefined });
}

export async function resetBotStateForTests(): Promise<void> {
  globalThis.__botStateCache = {
    ...DEFAULT_STATE,
    nextRunAt: computeNextRun(),
  };
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
}

export { computeNextRun };
