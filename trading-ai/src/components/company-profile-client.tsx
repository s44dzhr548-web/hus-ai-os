"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CompanyIntelligenceProfile } from "@/lib/intelligence/company-types";
import { profilePathForSymbol } from "@/lib/intelligence/symbol-resolver";
import { RecommendationBadge, RiskBadge } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {children}
    </section>
  );
}

function LogoBadge({ initials, color }: { initials: string; color: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: color }}>
      {initials}
    </span>
  );
}

export function CompanyProfileClient({ symbolParam }: { symbolParam: string }) {
  const { t, locale } = useI18n();
  const cp = t.companyProfile;
  const [profile, setProfile] = useState<CompanyIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/company/${encodeURIComponent(symbolParam)}/profile?lang=${locale}`);
    const data = await res.json();
    setProfile(data.profile ?? null);
    setLoading(false);
  }, [symbolParam, locale]);

  useEffect(() => {
    load();
  }, [load]);

  async function paperOrder(side: "buy" | "sell") {
    if (!profile) return;
    const res = await fetch("/api/paper/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: profile.overview.symbol, side, quantity: qty }),
    });
    const data = await res.json();
    setActionMsg(data.ok ? `${side.toUpperCase()} paper order placed` : data.error ?? "Order failed");
  }

  async function addWatchlist() {
    if (!profile) return;
    const res = await fetch("/api/watchlist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: profile.overview.symbol }),
    });
    const data = await res.json();
    setActionMsg(data.ok ? "Added to watchlist" : data.error ?? "Failed");
  }

  async function createAlert() {
    if (!profile) return;
    const res = await fetch("/api/alerts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: profile.overview.symbol,
        title: `${profile.overview.displaySymbol} AI Alert`,
        message: `${profile.ai.recommendation.toUpperCase()} · score ${profile.ai.aiScore} · ${profile.overview.name}`,
        type: "signal",
      }),
    });
    const data = await res.json();
    setActionMsg(data.ok ? "Alert created" : data.error ?? "Failed");
  }

  async function addJournal() {
    if (!profile) return;
    const res = await fetch("/api/journal/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: profile.overview.symbol,
        userDecision: profile.ai.recommendation,
        aiRecommendation: profile.ai.recommendation,
        userNotes: `Reviewed intelligence profile for ${profile.overview.name}`,
      }),
    });
    const data = await res.json();
    setActionMsg(data.ok ? "Journal entry added" : data.error ?? "Failed");
  }

  async function addPortfolioSimulator() {
    if (!profile) return;
    const res = await fetch("/api/portfolio/simulation/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: profile.overview.symbol, weightPct: 5 }),
    });
    const data = await res.json();
    setActionMsg(data.ok ? `Added to portfolio simulator (${profile.overview.displaySymbol})` : data.error ?? "Failed");
  }

  if (loading) return <p className="text-zinc-400">{cp.loading}</p>;
  if (!profile) return <p className="text-red-400">{cp.notFound}</p>;

  const { overview, quote, ai, why, financials, announcements, news, technical, risk, providers, related, moneyFlow } = profile;
  const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/markets" className="text-sm text-emerald-400 hover:underline">
          ← {cp.backToMarkets}
        </Link>
        <span className="rounded bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{cp.paperOnly}</span>
      </div>

      {!profile.persistenceConfigured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">{cp.persistenceWarning}</div>
      )}

      <header className="flex flex-wrap items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <LogoBadge initials={overview.logo.initials} color={overview.logo.color} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{overview.name}</h1>
          <p className="text-zinc-400">
            {overview.displaySymbol} · {overview.exchange} · {overview.market}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <RecommendationBadge rec={ai.recommendation} />
            <RiskBadge level={ai.riskLevel} />
            <span className="text-xs text-zinc-500">{quote.dataSource.toUpperCase()} · {quote.provider}</span>
          </div>
        </div>
        <div className="text-end">
          <p className="text-3xl font-semibold">
            {quote.currency === "USD" ? "$" : ""}
            {quote.price.toLocaleString()}
          </p>
          <p className={quote.dayChangePct >= 0 ? "text-emerald-400" : "text-red-400"}>{pct(quote.dayChangePct)}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={cp.overview}>
          <p className="text-sm leading-relaxed text-zinc-300">{overview.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-zinc-500">{t.markets.exchange}</dt><dd>{overview.exchange}</dd></div>
            <div><dt className="text-zinc-500">{t.markets.industry}</dt><dd>{overview.industry}</dd></div>
            <div><dt className="text-zinc-500">Sector</dt><dd>{overview.sector}</dd></div>
            <div><dt className="text-zinc-500">Country</dt><dd>{overview.country}</dd></div>
            {overview.marketCap && (
              <div><dt className="text-zinc-500">{cp.marketCap}</dt><dd>{overview.marketCap.toLocaleString()}</dd></div>
            )}
            {overview.employees && (
              <div><dt className="text-zinc-500">{cp.employees}</dt><dd>{overview.employees.toLocaleString()}</dd></div>
            )}
          </dl>
          {overview.website && (
            <a href={overview.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
              {cp.website}
            </a>
          )}
        </Section>

        <Section title={cp.liveData}>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><p className="text-zinc-500">{cp.open}</p><p>{quote.open}</p></div>
            <div><p className="text-zinc-500">{cp.high}</p><p>{quote.high}</p></div>
            <div><p className="text-zinc-500">{cp.low}</p><p>{quote.low}</p></div>
            <div><p className="text-zinc-500">{cp.previousClose}</p><p>{quote.previousClose}</p></div>
            <div><p className="text-zinc-500">{cp.volume}</p><p>{quote.volume.toLocaleString()}</p></div>
            {quote.high52w != null && <div><p className="text-zinc-500">{cp.high52w}</p><p>{quote.high52w}</p></div>}
            {quote.low52w != null && <div><p className="text-zinc-500">{cp.low52w}</p><p>{quote.low52w}</p></div>}
            <div><p className="text-zinc-500">{cp.dayChange}</p><p>{pct(quote.dayChangePct)}</p></div>
            <div><p className="text-zinc-500">{cp.weekChange}</p><p>{pct(quote.weekChangePct)}</p></div>
            <div><p className="text-zinc-500">{cp.monthChange}</p><p>{pct(quote.monthChangePct)}</p></div>
            <div><p className="text-zinc-500">{cp.yearChange}</p><p>{pct(quote.yearChangePct)}</p></div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {cp.dataSourceLabel}: {quote.dataSource.toUpperCase()} · {quote.provider} · {new Date(quote.lastUpdated).toLocaleString()}
          </p>
        </Section>

        <Section title={cp.aiRecommendation}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>AI score: {ai.aiScore}/100</p>
            <p>{t.common.confidence}: {(ai.confidence * 100).toFixed(0)}%</p>
            <p>{t.markets.riskScore}: {ai.riskScore}/100</p>
            <p>Upside: {pct(ai.expectedUpsidePct)}</p>
            <p>Downside: {pct(ai.expectedDownsidePct)}</p>
            <p>{cp.entryZone}: {ai.entryZone.low}–{ai.entryZone.high}</p>
            <p>{cp.exitZone}: {ai.exitZone.low}–{ai.exitZone.high}</p>
            <p>{cp.stopLoss}: {ai.stopLoss}</p>
            <p>{cp.takeProfit}: {ai.takeProfit}</p>
            <p className="col-span-2 text-zinc-500">{cp.reviewBy}: {new Date(ai.reviewBy).toLocaleString()}</p>
          </div>
        </Section>

        <Section title={cp.whySelected}>
          <WhyList label="Technical" items={why.technical} />
          <WhyList label="Fundamental" items={why.fundamental} />
          <WhyList label="News" items={why.news} />
          <WhyList label="Sector" items={why.sector} />
          <WhyList label="Macro" items={why.macro} />
          <p className="mt-2 text-xs text-zinc-500">{why.oilImpact} · {why.ratesImpact}</p>
          <WhyList label="Correlation" items={why.correlation} />
          <WhyList label="Invalidation" items={why.invalidation} />
        </Section>

        <Section title={cp.financials}>
          {financials.revenue ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Revenue: {financials.revenue?.toLocaleString()}</p>
              <p>Net income: {financials.netIncome?.toLocaleString()}</p>
              <p>EPS: {financials.eps}</p>
              <p>P/E: {financials.pe}</p>
              <p>PEG: {financials.peg}</p>
              <p>Debt: {financials.debt?.toLocaleString()}</p>
              <p>Cash flow: {financials.cashFlow?.toLocaleString()}</p>
              <p>Gross margin: {financials.grossMarginPct}%</p>
              <p>Op margin: {financials.operatingMarginPct}%</p>
              <p>Dividend: {financials.dividendYieldPct}%</p>
              <p>Earnings: {financials.nextEarningsDate}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{financials.note}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500">{financials.provider} · {financials.dataSource}</p>
        </Section>

        <Section title={cp.announcements}>
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-zinc-500">{a.date} · {a.type}</p>
                <p className="text-zinc-400">{a.summary}</p>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    Open source
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={cp.news}>
          <ul className="space-y-2">
            {news.map((n, i) => (
              <li key={i} className="text-sm text-zinc-300">
                <span className="text-zinc-500">[{n.sentiment}] impact {n.impactScore} · </span>
                {n.headline} — {n.source}
              </li>
            ))}
          </ul>
          {related.length > 0 && (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-500">{cp.newsRelated}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {related.slice(0, 4).map((r) => (
                  <Link key={r.symbol} href={profilePathForSymbol(r.symbol, r.displaySymbol)} className="text-xs text-emerald-400 hover:underline">
                    {r.displaySymbol}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title={cp.technical}>
          <p className="text-sm text-zinc-300">{technical.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <p>RSI: {technical.rsi.toFixed(1)}</p>
            <p>MACD: {technical.macdSignal}</p>
            <p>{cp.sma20}: {technical.sma20.toFixed(2)}</p>
            <p>{cp.sma50}: {technical.sma50.toFixed(2)}</p>
            <p>Support: {technical.support}</p>
            <p>Resistance: {technical.resistance}</p>
            <p>Trend: {technical.trend}</p>
            <p>Momentum: {technical.trendStrength}/100</p>
            <p>Volatility: {(technical.volatility * 100).toFixed(1)}%</p>
          </div>
        </Section>

        <Section title={cp.riskGuardian}>
          <p className="text-sm text-zinc-300">{risk.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <p>Volatility: {risk.volatilityRisk}/100</p>
            <p>Liquidity: {risk.liquidityRisk}/100</p>
            <p>Sector: {risk.sectorRisk}/100</p>
            <p>Correlation: {risk.correlationRisk}/100</p>
            <p>News: {risk.newsRisk}/100</p>
            <p>Position size: {risk.suggestedPositionPct}%</p>
          </div>
        </Section>

        {moneyFlow && (
          <Section title={t.smartMoney.moneyFlowSection}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>{t.smartMoney.inflowOutflow}: <span className={moneyFlow.flowDirection === "inflow" ? "text-emerald-400" : moneyFlow.flowDirection === "outflow" ? "text-red-400" : "text-zinc-400"}>{moneyFlow.flowDirection}</span></p>
              <p>{t.smartMoney.flowOpportunityScore}: {moneyFlow.opportunityScore}/100</p>
              <p>{t.smartMoney.volumeAnomaly}: {moneyFlow.volumeAnomaly ? "Yes" : "No"} ({moneyFlow.volumeAnomalyScore})</p>
              <p>{locale === "ar" ? "إشارة" : "Signal"}: {moneyFlow.institutionalSignal}</p>
              <p className="col-span-2 text-xs text-zinc-400">{locale === "ar" ? moneyFlow.sectorRotationImpactAr : moneyFlow.sectorRotationImpactEn}</p>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{locale === "ar" ? moneyFlow.explanationAr.whyMoving : moneyFlow.explanationEn.whyMoving}</p>
            {moneyFlow.relatedAffected.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {moneyFlow.relatedAffected.map((r) => (
                  <Link key={r.symbol} href={profilePathForSymbol(r.symbol, r.displaySymbol)} className="text-xs text-emerald-400 hover:underline">
                    {r.displaySymbol}
                  </Link>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>

      <Section title={cp.providers}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-lg bg-zinc-950/50 p-3 text-xs">
              <p className="font-medium">{p.label}</p>
              <p className="text-zinc-500">
                {p.status === "connected" ? cp.connected : p.status === "missing" ? cp.missing : cp.demoFallback}
                · {cp.dataQuality} {p.dataQualityScore}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={cp.related}>
        <div className="flex flex-wrap gap-2">
          {related.map((r) => (
            <Link
              key={r.symbol}
              href={profilePathForSymbol(r.symbol, r.displaySymbol)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-emerald-500/50"
            >
              {r.displaySymbol} · {r.relation}
            </Link>
          ))}
        </div>
      </Section>

      <Section title={cp.actions}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            {cp.quantity}
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
              className="ms-2 w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
            />
          </label>
          <button type="button" onClick={() => paperOrder("buy")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
            {cp.paperBuy}
          </button>
          <button type="button" onClick={() => paperOrder("sell")} className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white">
            {cp.paperSell}
          </button>
          <button type="button" onClick={addWatchlist} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm">
            {cp.addWatchlist}
          </button>
          <button type="button" onClick={createAlert} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm">
            {cp.addAlert}
          </button>
          <button type="button" onClick={addJournal} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm">
            {cp.addJournal}
          </button>
          <button type="button" onClick={addPortfolioSimulator} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm">
            {cp.addPortfolioSimulator}
          </button>
        </div>
        {actionMsg && <p className="mt-3 text-sm text-emerald-400">{actionMsg}</p>}
      </Section>
    </div>
  );
}

function WhyList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <ul className="mt-1 list-inside list-disc text-sm text-zinc-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
