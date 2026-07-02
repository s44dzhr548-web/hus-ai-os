#!/usr/bin/env node
/**
 * Sync market-data env vars to Vercel and verify provider connectivity.
 * Never prints secret values.
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const INPUT_FILE = path.join(ROOT, ".provider-keys.local");
const TEAM_ID = "team_22KVyDhzM2nxPmThaTLMnIwQ";
const PROJECT_ID = "prj_ySTMavWJmLlDPd7eCI6stnfkpaIk";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  }
  return out;
}

function upsertEnvLines(filePath, updates) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key) && updates[key]) {
      out.push(`${key}=${updates[key]}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!value || seen.has(key)) continue;
    out.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, out.join("\n") + (out[out.length - 1] === "" ? "" : "\n"));
}

function getVercelToken() {
  const candidates = [
    path.join(process.env.APPDATA || "", "com.vercel.cli", "auth.json"),
    path.join(
      process.env.APPDATA || path.join(process.env.HOME || "", "AppData", "Roaming"),
      "xdg.data",
      "com.vercel.cli",
      "auth.json"
    ),
  ];
  const authPath = candidates.find((p) => p && fs.existsSync(p));
  if (!authPath) throw new Error("Vercel auth not found. Run vercel login.");
  return JSON.parse(fs.readFileSync(authPath, "utf8")).token;
}

function vercelRequest(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "api.vercel.com",
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : {});
          } else {
            reject(new Error(`Vercel API ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function listProjectEnv(token) {
  const data = await vercelRequest(
    "GET",
    `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    token
  );
  return data.envs || [];
}

async function upsertEnvVar(token, key, value) {
  const existing = await listProjectEnv(token);
  const match = existing.find((e) => e.key === key);
  const body = {
    key,
    value,
    type: "encrypted",
    target: ["production", "preview", "development"],
  };
  if (match) {
    await vercelRequest("PATCH", `/v9/projects/${PROJECT_ID}/env/${match.id}?teamId=${TEAM_ID}`, token, body);
    return "updated";
  }
  await vercelRequest("POST", `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, token, body);
  return "created";
}

async function verifyMassive(key) {
  const endpoints = [
    "https://api.massive.com/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=",
    "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=",
  ];
  let lastError = "No endpoints tried";
  for (const base of endpoints) {
    const url = base + encodeURIComponent(key);
    const res = await fetch(url);
    if (!res.ok) {
      lastError = `HTTP ${res.status} on ${new URL(base).hostname}`;
      continue;
    }
    const data = await res.json();
    if (!data?.results?.[0]?.c) {
      lastError = "No quote data in response";
      continue;
    }
    return { symbol: "AAPL", price: data.results[0].c, host: new URL(base).hostname };
  }
  throw new Error(`Massive/Polygon: ${lastError}`);
}

async function verifyFinnhub(key) {
  const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.c) throw new Error("Finnhub: no quote data in response");
  return { symbol: "AAPL", price: data.c };
}

async function verifyTwelveData(key) {
  const url = `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  const data = await res.json();
  if (data?.status === "error") throw new Error(`Twelve Data: ${data.message || "error"}`);
  if (!data?.close) throw new Error("Twelve Data: no quote data in response");
  return { symbol: "AAPL", price: Number(data.close) };
}

async function verifyFmp(key) {
  const bases = [
    "https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=",
    "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=",
  ];
  let lastError = "No endpoints tried";
  for (const base of bases) {
    const res = await fetch(base + encodeURIComponent(key));
    if (!res.ok) {
      lastError = `HTTP ${res.status} on ${new URL(base).pathname}`;
      continue;
    }
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    const price = row?.price ?? row?.previousClose;
    if (!price) {
      lastError = "No quote data in response";
      continue;
    }
    return { symbol: "AAPL", price: Number(price) };
  }
  throw new Error(`FMP: ${lastError}`);
}

async function verifyNewsApi(key) {
  const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const data = await res.json();
  if (data?.status === "error") throw new Error(`NewsAPI: ${data.message || "error"}`);
  if (!data?.articles?.length) throw new Error("NewsAPI: no articles in response");
  return { articles: data.totalResults ?? data.articles.length };
}

async function verifyCoingecko(key) {
  const headers = key ? { "x-cg-pro-api-key": key } : {};
  const host = key ? "https://pro-api.coingecko.com" : "https://api.coingecko.com";
  const res = await fetch(`${host}/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`, { headers });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.bitcoin?.usd) throw new Error("CoinGecko: no price in response");
  return { symbol: "BTCUSD", price: data.bitcoin.usd, tier: key ? "pro" : "public" };
}

async function verifyBinance() {
  const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.lastPrice) throw new Error("Binance: no price in response");
  return { symbol: "BTCUSD", price: Number(data.lastPrice) };
}

async function verifyTadawulSaudi() {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/2222.SR?interval=1d&range=1d",
    { headers: { "User-Agent": "TradingAI/1.0" } }
  );
  if (!res.ok) throw new Error(`Saudi/Yahoo HTTP ${res.status}`);
  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error("Saudi: no quote for 2222.SR");
  return { symbol: "2222", price: Number(price), source: "yahoo_sr_fallback" };
}

const MVP_VERIFIERS = {
  polygon: (env) => verifyMassive(env.MASSIVE_API_KEY || env.POLYGON_API_KEY),
  newsapi: (env) => {
    if (!env.NEWS_API_KEY) throw new Error("NEWS_API_KEY not configured");
    return verifyNewsApi(env.NEWS_API_KEY);
  },
  coingecko: (env) => verifyCoingecko(env.COINGECKO_API_KEY),
  binance: () => verifyBinance(),
  tadawul: () => verifyTadawulSaudi(),
};

async function main() {
  const cmd = process.argv[2];
  const env = loadEnvFile(ENV_FILE);

  if (cmd === "apply-local-input") {
    const input = loadEnvFile(INPUT_FILE);
    if (!Object.keys(input).length) {
      console.log(JSON.stringify({ ok: false, error: "Create .provider-keys.local from .env.providers.example" }));
      process.exit(1);
    }
    upsertEnvLines(ENV_FILE, input);
    const applied = Object.keys(input).filter((k) => input[k]);
    console.log(JSON.stringify({ ok: true, appliedKeys: applied, appliedCount: applied.length }));
    return;
  }

  if (cmd === "verify-massive") {
    const key =
      env.MASSIVE_API_KEY ||
      env.POLYGON_API_KEY ||
      env.MASSIVE_ACCESS_KEY_ID;
    if (!key) {
      console.log(JSON.stringify({ ok: false, error: "MASSIVE_API_KEY / POLYGON_API_KEY not in .env.local" }));
      process.exit(1);
    }
    try {
      const quote = await verifyMassive(key);
      console.log(JSON.stringify({ ok: true, provider: "massive/polygon", keyLength: key.length, ...quote }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, keyLength: key.length, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-finnhub") {
    const key = env.FINNHUB_API_KEY;
    if (!key) {
      console.log(JSON.stringify({ ok: false, error: "FINNHUB_API_KEY not in .env.local" }));
      process.exit(1);
    }
    try {
      const quote = await verifyFinnhub(key);
      console.log(JSON.stringify({ ok: true, provider: "finnhub", keyLength: key.length, ...quote }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, keyLength: key.length, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-twelve-data") {
    const key = env.TWELVE_DATA_API_KEY;
    if (!key) {
      console.log(JSON.stringify({ ok: false, error: "TWELVE_DATA_API_KEY not in .env.local" }));
      process.exit(1);
    }
    try {
      const quote = await verifyTwelveData(key);
      console.log(JSON.stringify({ ok: true, provider: "twelve_data", keyLength: key.length, ...quote }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, keyLength: key.length, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-fmp") {
    const key = env.FMP_API_KEY;
    if (!key) {
      console.log(JSON.stringify({ ok: false, error: "FMP_API_KEY not in .env.local" }));
      process.exit(1);
    }
    try {
      const quote = await verifyFmp(key);
      console.log(JSON.stringify({ ok: true, provider: "fmp", keyLength: key.length, ...quote }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, keyLength: key.length, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-newsapi") {
    const key = env.NEWS_API_KEY;
    if (!key) {
      console.log(JSON.stringify({ ok: false, error: "NEWS_API_KEY not in .env.local" }));
      process.exit(1);
    }
    try {
      const result = await verifyNewsApi(key);
      console.log(JSON.stringify({ ok: true, provider: "newsapi", keyLength: key.length, ...result }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, keyLength: key.length, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-coingecko") {
    try {
      const result = await verifyCoingecko(env.COINGECKO_API_KEY);
      console.log(JSON.stringify({ ok: true, provider: "coingecko", keyed: Boolean(env.COINGECKO_API_KEY), ...result }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-binance") {
    try {
      const result = await verifyBinance();
      console.log(JSON.stringify({ ok: true, provider: "binance", keyed: Boolean(env.BINANCE_API_KEY), ...result }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-tadawul") {
    try {
      const result = await verifyTadawulSaudi();
      console.log(JSON.stringify({ ok: true, provider: "tadawul", keyed: Boolean(env.TADAWUL_PROVIDER_KEY), ...result }));
    } catch (e) {
      console.log(JSON.stringify({ ok: false, error: e.message }));
      process.exit(1);
    }
    return;
  }

  if (cmd === "verify-mvp-queue") {
    const queue = ["polygon", "newsapi", "coingecko", "binance", "tadawul"];
    const results = {};
    for (const name of queue) {
      const start = Date.now();
      try {
        if (name === "newsapi" && !env.NEWS_API_KEY) {
          results[name] = { ok: false, skipped: true, error: "Awaiting NEWS_API_KEY" };
          continue;
        }
        const fn = MVP_VERIFIERS[name];
        const data = await fn(env);
        results[name] = { ok: true, latencyMs: Date.now() - start, ...data };
      } catch (e) {
        results[name] = { ok: false, latencyMs: Date.now() - start, error: e.message };
      }
    }
    console.log(JSON.stringify({ ok: true, results }));
    return;
  }

  if (cmd === "generate-mvp-report") {
    const base = process.argv[3] || "https://trading-ai-beta.vercel.app";
    const res = await fetch(`${base}/api/market/providers/verify`);
    if (!res.ok) throw new Error(`Production verify HTTP ${res.status}`);
    const report = await res.json();
    const chains = {
      us_stock: "polygon → finnhub → yahoo → twelve_data",
      saudi: "tadawul (yahoo .SR) → yahoo → alpha_vantage",
      crypto: "binance → coingecko → polygon",
      forex: "frankfurter → twelve_data → alpha_vantage",
      commodity: "yahoo → twelve_data",
      etf: "polygon → finnhub → yahoo",
      news: "newsapi → yahoo rss",
      economic_calendar: "faireconomy (free) → finnhub · TE optional deferred",
    };
    const outPath = path.join(ROOT, "PROVIDER_MVP_FINAL_REPORT.md");
    const lines = [
      "# Trading AI — Provider MVP Final Report",
      "",
      `**Generated:** ${new Date().toISOString()}`,
      `**Production:** ${base}`,
      "",
      "## Connected providers",
      "",
      "| Provider | Live | Latency | Key |",
      "|----------|------|---------|-----|",
    ];
    for (const p of report.providers) {
      if (p.id === "mock") continue;
      lines.push(
        `| ${p.name} | ${p.connected ? "✅" : "❌"} | ${p.latencyMs ?? "—"}ms | ${p.hasApiKey ? "yes" : "public/fallback"} |`
      );
    }
    lines.push(
      "",
      "## Optional / deferred (MVP)",
      "",
      "| Provider | Env | Reason |",
      "|----------|-----|--------|",
      "| Trading Economics | `TRADING_ECONOMICS_API_KEY` | ~$49/week — deferred; architecture ready |",
      "| CoinGecko Pro | `COINGECKO_API_KEY` | Public tier active |",
      "| Binance signed | `BINANCE_API_KEY` | Public market data active |",
      "| Tadawul licensed | `TADAWUL_PROVIDER_KEY` | Yahoo `.SR` fallback active |",
      "",
      "## Coverage by market",
      "",
      "| Market | Symbol | Source | Price |",
      "|--------|--------|--------|-------|",
    );
    for (const m of report.liveMarkets) {
      lines.push(`| ${m.market} | ${m.symbol} | ${m.source} | ${m.price ?? "—"} |`);
    }
    for (const m of report.demoMarkets) {
      lines.push(`| ${m.market} (demo) | ${m.symbol} | — | ${m.reason} |`);
    }
    lines.push(
      "",
      "## Fallback priority",
      "",
      ...Object.entries(chains).map(([k, v]) => `- **${k}:** ${v}`),
      "",
      "## Missing required keys",
      "",
      report.missingApiKeys.length ? report.missingApiKeys.map((k) => `- \`${k}\``).join("\n") : "_None (MVP queue complete)_",
      "",
    );
    fs.writeFileSync(outPath, lines.join("\n"));
    console.log(JSON.stringify({ ok: true, reportPath: outPath, connected: report.connectedProviders.length }));
    return;
  }

  if (cmd === "sync-vercel") {
    const keys = (process.argv[3] || "MASSIVE_API_KEY,POLYGON_API_KEY").split(",").map((k) => k.trim());
    const token = getVercelToken();
    const results = {};
    for (const key of keys) {
      const value = env[key];
      if (!value) {
        results[key] = "skipped (missing locally)";
        continue;
      }
      results[key] = await upsertEnvVar(token, key, value);
    }
    console.log(JSON.stringify({ ok: true, synced: results }));
    return;
  }

  console.log(
    "Usage: node scripts/provider-env.mjs <apply-local-input|verify-massive|verify-finnhub|verify-twelve-data|verify-fmp|verify-newsapi|verify-coingecko|verify-binance|verify-tadawul|verify-mvp-queue|generate-mvp-report|sync-vercel> [args]"
  );
  process.exit(1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
