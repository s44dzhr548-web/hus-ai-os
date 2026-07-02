import type { Recommendation, RiskLevel } from "@/types/trading";
import { computeSignalScore } from "@/lib/ai/analysis-engine";
import { generateMockBars, getMockAsset } from "@/lib/data/mock-market";
import { getSectorImpact } from "@/lib/data/mock-news";
import { hashSymbol } from "@/lib/data/seed";
import { computeTechnical } from "@/lib/market/indicators";
import { isRealMarketDataMode } from "@/lib/market/config";
import { unifiedQuote } from "@/lib/market/unified";
import {
  getAllActiveAssets,
  getAssetBySymbol,
  getAssetsByMarketTab,
  universeCategoryToAssetClass,
} from "@/lib/markets/asset-universe";
import { createAlert } from "@/lib/learning/tracker";
import type {
  AssetClassFlow,
  AssetFlowProfile,
  FlowDashboardCards,
  FlowDirection,
  FlowExplanation,
  FlowOpportunity,
  FlowOpportunityScore,
  FlowRankings,
  FlowRegime,
  FlowTimeHorizon,
  SectorFlow,
  SectorRotation,
  SmartMoneySnapshot,
} from "./smart-money-types";

const SECTOR_AR: Record<string, string> = {
  Technology: "تقنية",
  Financials: "مالية",
  Energy: "طاقة",
  Healthcare: "رعاية صحية",
  Consumer: "استهلاكية",
  Materials: "مواد",
  Communication: "اتصالات",
  Utilities: "مرافق",
  Industrials: "صناعات",
};

const ASSET_CLASS_NODES: Array<{ id: string; labelEn: string; labelAr: string; tab: "us" | "saudi" | "crypto" | "gold" | "oil" | "forex" | "etf" | "commodity" }> = [
  { id: "stocks", labelEn: "Stocks", labelAr: "أسهم", tab: "us" },
  { id: "saudi", labelEn: "Saudi Market", labelAr: "السوق السعودي", tab: "saudi" },
  { id: "us", labelEn: "US Market", labelAr: "السوق الأمريكي", tab: "us" },
  { id: "crypto", labelEn: "Crypto", labelAr: "عملات رقمية", tab: "crypto" },
  { id: "gold", labelEn: "Gold", labelAr: "ذهب", tab: "gold" },
  { id: "oil", labelEn: "Oil", labelAr: "نفط", tab: "oil" },
  { id: "forex", labelEn: "Forex", labelAr: "فوركس", tab: "forex" },
  { id: "bonds", labelEn: "Bonds", labelAr: "سندات", tab: "etf" },
  { id: "cash", labelEn: "Cash", labelAr: "نقد", tab: "commodity" },
];

declare global {
  // eslint-disable-next-line no-var
  var __smartMoneyAlertKeys: Set<string> | undefined;
}

function alertDedupKey(type: string, target: string) {
  return `${type}:${target}:${new Date().toISOString().slice(0, 10)}`;
}

function maybeCreateFlowAlert(type: string, target: string, title: string, message: string, symbol?: string) {
  if (!globalThis.__smartMoneyAlertKeys) globalThis.__smartMoneyAlertKeys = new Set();
  const key = alertDedupKey(type, target);
  if (globalThis.__smartMoneyAlertKeys.has(key)) return;
  globalThis.__smartMoneyAlertKeys.add(key);
  createAlert({
    channel: "dashboard",
    type: "signal",
    title,
    message,
    symbol,
    severity: type.includes("risk") ? "high" : "medium",
    whatsappReady: true,
  });
}

function riskLevelFromScore(risk: number): RiskLevel {
  if (risk >= 75) return "high";
  if (risk >= 50) return "medium";
  return "low";
}

function scoreRecommendation(score: number): Recommendation {
  if (score >= 65) return "buy";
  if (score <= 35) return "sell";
  return "hold";
}

function computeFlowPct(seed: string, changeBias = 0): number {
  const h = hashSymbol(seed + "-flow");
  return Number(((h % 25) - 10 + changeBias).toFixed(1));
}

function directionFromPct(pct: number): FlowDirection {
  if (pct >= 3) return "inflow";
  if (pct <= -3) return "outflow";
  return "neutral";
}

function institutionalSignal(seed: string, direction: FlowDirection): "accumulation" | "distribution" | "neutral" {
  const h = hashSymbol(seed + "-inst") % 10;
  if (direction === "inflow" && h > 5) return "accumulation";
  if (direction === "outflow" && h > 5) return "distribution";
  return "neutral";
}

function trendType(flowPct: number, volumeSignal: number): "temporary" | "trend" {
  return Math.abs(flowPct) > 8 && volumeSignal > 60 ? "trend" : "temporary";
}

async function scoreSymbol(symbol: string) {
  const asset = getAssetBySymbol(symbol);
  const bars = generateMockBars(symbol, 60);
  const mock = getMockAsset(symbol);
  const technical = computeTechnical(bars);
  let price = mock.price;
  let changePct = mock.changePct;
  let isDemo = true;

  try {
    const quote = await unifiedQuote(symbol);
    price = quote.data.price;
    changePct = quote.data.changePct;
    isDemo = quote.isDemoData;
  } catch {
    /* seeded fallback */
  }

  const signal = computeSignalScore(symbol, bars, price, changePct);
  const sector = getSectorImpact(symbol);
  const h = hashSymbol(symbol + "sm");

  const moneyFlow = Math.min(100, Math.max(0, 50 + changePct * 4 + (signal.score - 50) * 0.4));
  const technicalStrength = signal.score;
  const fundamentals = Math.min(100, 40 + (h % 45) + (asset?.category.includes("stock") ? 10 : 0));
  const newsSentiment = Math.min(100, 45 + (h % 40));
  const macro = Math.min(100, 40 + Math.abs(sector.impact) * 40);
  const risk = Math.min(100, 25 + technical.volatility * 80 + (100 - signal.score) * 0.2);

  const total = Number(
    (
      moneyFlow * 0.25 +
      technicalStrength * 0.2 +
      fundamentals * 0.2 +
      newsSentiment * 0.15 +
      macro * 0.1 +
      (100 - risk) * 0.1
    ).toFixed(1)
  );

  const breakdown: FlowOpportunityScore = {
    total,
    moneyFlow: Number(moneyFlow.toFixed(1)),
    technical: Number(technicalStrength.toFixed(1)),
    fundamentals: Number(fundamentals.toFixed(1)),
    newsSentiment: Number(newsSentiment.toFixed(1)),
    macro: Number(macro.toFixed(1)),
    risk: Number(risk.toFixed(1)),
  };

  const flowDirection = directionFromPct(changePct + (signal.score - 50) * 0.08);
  const volumeAnomaly = technical.volumeTrend === "rising" && Math.abs(changePct) > 1.5;
  const inst = institutionalSignal(symbol, flowDirection);

  return {
    asset,
    signal,
    technical,
    changePct,
    breakdown,
    flowDirection,
    volumeAnomaly,
    inst,
    isDemo,
    sector,
  };
}

function buildExplanation(
  symbol: string,
  name: string,
  sector: string,
  flowDirection: FlowDirection,
  breakdown: FlowOpportunityScore,
  inst: "accumulation" | "distribution" | "neutral",
  locale: "en" | "ar"
): FlowExplanation {
  const dirEn = flowDirection === "inflow" ? "entering" : flowDirection === "outflow" ? "leaving" : "neutral on";
  const dirAr = flowDirection === "inflow" ? "يدخل" : flowDirection === "outflow" ? "يخرج" : "محايد على";

  if (locale === "ar") {
    return {
      whyMoving: `${dirAr} ${sector} · تدفق ${breakdown.moneyFlow}/100 · إشارة ${inst === "accumulation" ? "تراكم" : inst === "distribution" ? "توزيع" : "محايد"}`,
      evidence: [
        `قوة فنية ${breakdown.technical}/100`,
        `معنويات أخبار ${breakdown.newsSentiment}/100`,
        `تأثير ماكرو ${breakdown.macro}/100`,
      ],
      beneficiaries: flowDirection === "inflow" ? [name, sector, symbol] : [],
      hurt: flowDirection === "outflow" ? [name, sector] : [],
      reversal: "كسر الدعم مع حجم مرتفع أو تحول ماكرو (فائدة/نفط) قد يعكس التدفق.",
      confidenceNote: `ثقة AI ${Math.round(breakdown.total * 0.85)}/100 — تداول ورقي فقط.`,
    };
  }

  return {
    whyMoving: `Smart money is ${dirEn} ${sector} · flow score ${breakdown.moneyFlow}/100 · ${inst} pattern`,
    evidence: [
      `Technical strength ${breakdown.technical}/100`,
      `News sentiment ${breakdown.newsSentiment}/100`,
      `Macro impact ${breakdown.macro}/100`,
    ],
    beneficiaries: flowDirection === "inflow" ? [name, sector, symbol] : [],
    hurt: flowDirection === "outflow" ? [name, sector] : [],
    reversal: "Break below support on rising volume or macro shift (rates/oil) could reverse flow.",
    confidenceNote: `AI confidence ${Math.round(breakdown.total * 0.85)}/100 — paper trading only.`,
  };
}

function timeHorizon(score: number, volatility: number): FlowTimeHorizon {
  if (volatility > 0.5 || score > 75) return "short";
  if (score > 60) return "medium";
  return "long";
}

async function buildOpportunities(): Promise<FlowOpportunity[]> {
  const symbolSet = new Set<string>();
  for (const tab of ["saudi", "us", "crypto", "gold", "oil", "forex", "etf", "global"] as const) {
    for (const asset of getAssetsByMarketTab(tab).slice(0, 6)) {
      symbolSet.add(asset.symbol);
    }
  }
  const symbols = [...symbolSet].slice(0, 48);
  const scored = await Promise.all(symbols.map(async (symbol) => {
    const s = await scoreSymbol(symbol);
    const asset = s.asset!;
    const expectedReturn = Number(((s.breakdown.total - 50) * 0.18 + s.changePct * 0.5).toFixed(2));
    const opp: FlowOpportunity = {
      symbol,
      displaySymbol: asset.displaySymbol,
      name: asset.name,
      market: asset.market,
      sector: asset.sector,
      assetClass: universeCategoryToAssetClass(asset),
      score: s.breakdown.total,
      confidence: Number((s.signal.confidence * (s.breakdown.total / 100)).toFixed(2)),
      riskScore: s.breakdown.risk,
      riskLevel: riskLevelFromScore(s.breakdown.risk),
      expectedReturnPct: expectedReturn,
      timeHorizon: timeHorizon(s.breakdown.total, s.technical.volatility),
      recommendation: scoreRecommendation(s.breakdown.total),
      flowDirection: s.flowDirection,
      category: "best_inflow",
      volumeAnomaly: s.volumeAnomaly,
      institutionalSignal: s.inst,
      breakdown: s.breakdown,
      explanationEn: buildExplanation(symbol, asset.name, asset.sector, s.flowDirection, s.breakdown, s.inst, "en"),
      explanationAr: buildExplanation(symbol, asset.name, asset.sector, s.flowDirection, s.breakdown, s.inst, "ar"),
    };
    return opp;
  }));

  return scored.sort((a, b) => b.score - a.score);
}

function buildAssetClassFlows(): AssetClassFlow[] {
  return ASSET_CLASS_NODES.map((node) => {
    const assets = node.id === "bonds" || node.id === "cash"
      ? []
      : getAssetsByMarketTab(node.tab as never);
    const avgChange = assets.length
      ? assets.reduce((sum, a) => sum + (hashSymbol(a.symbol) % 7 - 3), 0) / assets.length
      : hashSymbol(node.id) % 5 - 2;
    const flowPct = computeFlowPct(node.id, avgChange);
    const direction = directionFromPct(flowPct);
    const volumeSignal = 35 + (hashSymbol(node.id + "vol") % 55);
    const inst = institutionalSignal(node.id, direction);
    return {
      id: node.id,
      labelEn: node.labelEn,
      labelAr: node.labelAr,
      flowPct,
      direction,
      volumeSignal,
      institutionalSignal: inst,
      trendType: trendType(flowPct, volumeSignal),
    };
  });
}

function buildSectorFlows(): { inflows: SectorFlow[]; outflows: SectorFlow[] } {
  const sectors = new Map<string, { sum: number; count: number }>();
  for (const asset of getAllActiveAssets()) {
    const entry = sectors.get(asset.sector) ?? { sum: 0, count: 0 };
    entry.sum += computeFlowPct(asset.symbol, asset.basePrice > 100 ? 1 : 0);
    entry.count += 1;
    sectors.set(asset.sector, entry);
  }

  const flows: SectorFlow[] = [...sectors.entries()].map(([sector, { sum, count }]) => {
    const flowPct = Number((sum / count).toFixed(1));
    const direction = directionFromPct(flowPct);
    return {
      sector,
      sectorAr: SECTOR_AR[sector] ?? sector,
      flowPct,
      direction,
      volumeAnomaly: Math.abs(flowPct) > 6,
      institutionalSignal: institutionalSignal(sector, direction),
    };
  });

  return {
    inflows: flows.filter((f) => f.direction === "inflow").sort((a, b) => b.flowPct - a.flowPct),
    outflows: flows.filter((f) => f.direction === "outflow").sort((a, b) => a.flowPct - b.flowPct),
  };
}

function buildRotations(inflows: SectorFlow[], outflows: SectorFlow[]): SectorRotation[] {
  if (!inflows.length || !outflows.length) return [];

  const rotations: SectorRotation[] = [];
  for (let i = 0; i < Math.min(3, inflows.length, outflows.length); i++) {
    const to = inflows[i]!;
    const from = outflows[i]!;
    const watch = getAllActiveAssets()
      .filter((a) => a.sector === to.sector)
      .slice(0, 4)
      .map((a) => a.symbol);

    rotations.push({
      fromSector: from.sector,
      fromSectorAr: from.sectorAr,
      toSector: to.sector,
      toSectorAr: to.sectorAr,
      strength: Number((to.flowPct - from.flowPct).toFixed(1)),
      reasonEn: `${from.sector} weakness + ${to.sector} volume inflow + macro tailwind`,
      reasonAr: `ضعف ${from.sectorAr} + تدفق حجم إلى ${to.sectorAr} + دعم ماكرو`,
      watchSymbols: watch,
      riskWarningEn: `Rotation may fade if ${to.sector} fails to hold momentum.`,
      riskWarningAr: `قد يتوقف التناوب إذا فشل ${to.sectorAr} في الحفاظ على الزخم.`,
    });
  }

  if (inflows.some((s) => s.sector === "Energy") && outflows.some((s) => s.sector === "Technology")) {
    rotations.unshift({
      fromSector: "Technology",
      fromSectorAr: SECTOR_AR.Technology ?? "تقنية",
      toSector: "Energy",
      toSectorAr: SECTOR_AR.Energy ?? "طاقة",
      strength: 12,
      reasonEn: "Oil rising + tech weakness + volume rotation",
      reasonAr: "ارتفاع النفط + ضعف التقنية + تناوب حجم",
      watchSymbols: getAssetsByMarketTab("oil").slice(0, 3).map((a) => a.symbol),
      riskWarningEn: "Energy rally may reverse on demand shock.",
      riskWarningAr: "قد ينعكس صعود الطاقة عند صدمة طلب.",
    });
  }

  return rotations.slice(0, 5);
}

function buildRankings(opportunities: FlowOpportunity[]): FlowRankings {
  const saudi = opportunities.filter((o) => o.assetClass === "saudi").slice(0, 8);
  const us = opportunities.filter((o) => o.assetClass === "stock" && o.market.includes("United")).slice(0, 8);
  const crypto = opportunities.filter((o) => o.assetClass === "crypto").slice(0, 8);
  const goldOil = opportunities.filter((o) => o.assetClass === "commodity" || ["GCUSD", "CLUSD", "BZUSD"].includes(o.symbol)).slice(0, 8);
  const lowRisk = [...opportunities].sort((a, b) => a.riskScore - b.riskScore).slice(0, 8);
  const highMomentum = [...opportunities].sort((a, b) => b.breakdown.technical - a.breakdown.technical).slice(0, 8);
  const earlyRotation = opportunities.filter((o) => o.volumeAnomaly && o.flowDirection === "inflow").slice(0, 8);
  const bestInflow = opportunities.filter((o) => o.flowDirection === "inflow").slice(0, 10);

  return { bestInflow, saudi, us, crypto, goldOil, lowRisk, highMomentum, earlyRotation };
}

function detectRegime(assetFlows: AssetClassFlow[]): { regime: FlowRegime; labelEn: string; labelAr: string } {
  const riskOn = assetFlows.filter((f) => ["stocks", "us", "crypto", "saudi"].includes(f.id) && f.direction === "inflow").length;
  const riskOff = assetFlows.filter((f) => ["bonds", "cash", "gold"].includes(f.id) && f.direction === "inflow").length;
  if (riskOn >= 3 && riskOn > riskOff) return { regime: "risk_on", labelEn: "Risk-On", labelAr: "Appetite للمخاطرة" };
  if (riskOff >= 2 && riskOff > riskOn) return { regime: "risk_off", labelEn: "Risk-Off", labelAr: "تجنب المخاطرة" };
  return { regime: "mixed", labelEn: "Mixed Rotation", labelAr: "تناوب مختلط" };
}

function evaluateFlowAlerts(snapshot: SmartMoneySnapshot) {
  const topIn = snapshot.sectorInflows[0];
  const topOut = snapshot.sectorOutflows[0];
  const topRot = snapshot.rotations[0];
  const best = snapshot.dashboardCards.bestOpportunity;

  if (topIn && topIn.flowPct >= 5) {
    maybeCreateFlowAlert("sector_inflow", topIn.sector, `Sector Inflow: ${topIn.sector}`, `Smart money entering ${topIn.sector} (+${topIn.flowPct}%)`, undefined);
  }
  if (topOut && topOut.flowPct <= -5) {
    maybeCreateFlowAlert("sector_outflow", topOut.sector, `Sector Outflow: ${topOut.sector}`, `Large outflow from ${topOut.sector} (${topOut.flowPct}%)`, undefined);
  }
  if (topRot) {
    maybeCreateFlowAlert("rotation", `${topRot.fromSector}-${topRot.toSector}`, `Rotation: ${topRot.fromSector} → ${topRot.toSector}`, topRot.reasonEn, topRot.watchSymbols[0]);
  }
  if (best && best.score >= 70) {
    maybeCreateFlowAlert("opportunity", best.symbol, `Flow Opportunity: ${best.displaySymbol}`, `Score ${best.score}/100 · ${best.recommendation.toUpperCase()}`, best.symbol);
  }
  const anomaly = snapshot.opportunities.find((o) => o.volumeAnomaly);
  if (anomaly) {
    maybeCreateFlowAlert("volume", anomaly.symbol, `Volume Anomaly: ${anomaly.displaySymbol}`, `Unusual volume detected · flow ${anomaly.flowDirection}`, anomaly.symbol);
  }
}

export async function buildSmartMoneySnapshot(): Promise<SmartMoneySnapshot> {
  const assetFlows = buildAssetClassFlows();
  const { inflows, outflows } = buildSectorFlows();
  const rotations = buildRotations(inflows, outflows);
  const opportunities = await buildOpportunities();
  const rankings = buildRankings(opportunities);
  const regimeInfo = detectRegime(assetFlows);

  const strongestInflow = [...assetFlows].sort((a, b) => b.flowPct - a.flowPct)[0]!;
  const strongestOutflow = [...assetFlows].sort((a, b) => a.flowPct - b.flowPct)[0]!;
  const bestOpportunity = rankings.bestInflow[0] ?? null;
  const highestRisk = [...opportunities].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null;

  const dashboardCards: FlowDashboardCards = {
    strongestInflow: { label: strongestInflow.labelEn, labelAr: strongestInflow.labelAr, flowPct: strongestInflow.flowPct },
    strongestOutflow: { label: strongestOutflow.labelEn, labelAr: strongestOutflow.labelAr, flowPct: strongestOutflow.flowPct },
    topRotation: rotations[0] ?? null,
    bestOpportunity,
    highestRisk,
  };

  const summaryEn = `${regimeInfo.labelEn}: capital rotating into ${inflows[0]?.sector ?? "leadership sectors"} and out of ${outflows[0]?.sector ?? "laggards"}. Top opportunity ${bestOpportunity?.displaySymbol ?? "—"} (${bestOpportunity?.score ?? 0}/100).`;
  const summaryAr = `${regimeInfo.labelAr}: السيولة تتجه إلى ${inflows[0]?.sectorAr ?? "قطاعات قيادية"} وتخرج من ${outflows[0]?.sectorAr ?? "متأخرة"}. أفضل فرصة ${bestOpportunity?.displaySymbol ?? "—"} (${bestOpportunity?.score ?? 0}/100).`;

  const snapshot: SmartMoneySnapshot = {
    period: "Last 5 sessions · rolling flow model",
    regime: regimeInfo.regime,
    regimeLabelEn: regimeInfo.labelEn,
    regimeLabelAr: regimeInfo.labelAr,
    assetFlows,
    sectorInflows: inflows,
    sectorOutflows: outflows,
    rotations,
    opportunities,
    rankings,
    dashboardCards,
    summaryEn,
    summaryAr,
    aiExplanationEn: `AI detects ${regimeInfo.labelEn.toLowerCase()} regime. ${rotations[0] ? `Rotation ${rotations[0].fromSector} → ${rotations[0].toSector}: ${rotations[0].reasonEn}.` : ""} Monitor volume anomalies and macro catalysts. Paper only.`,
    aiExplanationAr: `AI يكتشف نظام ${regimeInfo.labelAr}. ${rotations[0] ? `تناوب ${rotations[0].fromSectorAr} → ${rotations[0].toSectorAr}.` : ""} راقب شذوذ الحجم والمحفزات. تداول ورقي فقط.`,
    dataSource: isRealMarketDataMode() ? "mixed" : "demo",
    executionMode: "paper_only",
    brokerEnabled: false,
    updatedAt: new Date().toISOString(),
  };

  evaluateFlowAlerts(snapshot);
  return snapshot;
}

export async function buildAssetFlowProfile(symbolInput: string): Promise<AssetFlowProfile | null> {
  const asset = getAssetBySymbol(symbolInput);
  if (!asset) return null;

  const s = await scoreSymbol(asset.symbol);
  const { inflows, outflows } = buildSectorFlows();
  const rotation = buildRotations(inflows, outflows).find((r) => r.toSector === asset.sector || r.fromSector === asset.sector);

  const relatedAffected = getAllActiveAssets()
    .filter((a) => a.sector === asset.sector || a.market === asset.market)
    .filter((a) => a.symbol !== asset.symbol)
    .slice(0, 5)
    .map((a) => ({
      symbol: a.symbol,
      displaySymbol: a.displaySymbol,
      impact: s.flowDirection === "inflow" ? "Beneficiary of sector inflow" : "Sector outflow pressure",
    }));

  return {
    symbol: asset.symbol,
    displaySymbol: asset.displaySymbol,
    flowDirection: s.flowDirection,
    flowStrength: s.breakdown.moneyFlow,
    volumeAnomaly: s.volumeAnomaly,
    volumeAnomalyScore: s.volumeAnomaly ? 75 + (hashSymbol(asset.symbol) % 20) : 30 + (hashSymbol(asset.symbol) % 20),
    institutionalSignal: s.inst,
    sectorRotationImpactEn: rotation
      ? `${rotation.fromSector} → ${rotation.toSector}: ${rotation.reasonEn}`
      : `No major rotation affecting ${asset.sector} currently.`,
    sectorRotationImpactAr: rotation
      ? `${rotation.fromSectorAr} → ${rotation.toSectorAr}: ${rotation.reasonAr}`
      : `لا تناوب كبير يؤثر على ${asset.sector} حالياً.`,
    opportunityScore: s.breakdown.total,
    confidence: Number((s.signal.confidence * (s.breakdown.total / 100)).toFixed(2)),
    expectedReturnPct: Number(((s.breakdown.total - 50) * 0.18 + s.changePct * 0.5).toFixed(2)),
    timeHorizon: timeHorizon(s.breakdown.total, s.technical.volatility),
    relatedAffected,
    explanationEn: buildExplanation(asset.symbol, asset.name, asset.sector, s.flowDirection, s.breakdown, s.inst, "en"),
    explanationAr: buildExplanation(asset.symbol, asset.name, asset.sector, s.flowDirection, s.breakdown, s.inst, "ar"),
  };
}

export function getSmartMoneyOpportunitiesByCategory(category: string, snapshot: SmartMoneySnapshot) {
  switch (category) {
    case "saudi":
      return snapshot.rankings.saudi;
    case "us":
    case "usa":
      return snapshot.rankings.us;
    case "crypto":
      return snapshot.rankings.crypto;
    case "gold_oil":
    case "gold":
    case "oil":
      return snapshot.rankings.goldOil;
    case "low_risk":
      return snapshot.rankings.lowRisk;
    case "momentum":
    case "high_momentum":
      return snapshot.rankings.highMomentum;
    case "rotation":
    case "early_rotation":
      return snapshot.rankings.earlyRotation;
    default:
      return snapshot.rankings.bestInflow;
  }
}
