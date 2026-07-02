export type AssetClass =
  | "stock"
  | "crypto"
  | "forex"
  | "saudi"
  | "commodity"
  | "index"
  | "etf";
export type Recommendation = "buy" | "hold" | "sell";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AlertChannel = "dashboard" | "email" | "whatsapp";

export interface MarketBar {
  symbol: string;
  timeframe: string;
  bar_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  id?: string;
  symbol: string;
  strategy: string;
  direction: "long" | "short" | "neutral";
  strength: number;
  price_at_signal: number;
  metadata?: Record<string, unknown>;
}

export interface PaperTrade {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate?: string;
  side: "long";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPct?: number;
}

export interface BacktestResult {
  finalEquity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  trades: number;
  winRate: number;
  profitLoss: number;
  riskRewardRatio: number;
  winningTrades: number;
  losingTrades: number;
  equityCurve: { date: string; equity: number }[];
  tradeHistory: BacktestTrade[];
}

export interface StrategyBacktest {
  strategy: string;
  result: BacktestResult;
  reproducibilityHash: string;
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  price: number;
  changePct: number;
  volume: number;
  marketCap?: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  addedAt: string;
}

export interface AISignalScore {
  symbol: string;
  score: number;
  confidence: number;
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  price: number;
  changePct: number;
}

export interface TechnicalAnalysis {
  trend: "bullish" | "bearish" | "neutral";
  trendStrength: number;
  rsi: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  macd: number;
  macdSignal: "positive" | "negative" | "neutral";
  macdHistogram: number;
  support: number;
  resistance: number;
  volatility: number;
  volumeTrend: "rising" | "falling" | "flat";
  avgVolume: number;
  summary: string;
}

export interface NewsImpact {
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
  impactScore: number;
  source: string;
  publishedAt: string;
}

export interface EconomicEvent {
  title: string;
  category: "rates" | "oil" | "gdp" | "employment" | "inflation" | "other";
  impact: RiskLevel;
  date: string;
  description: string;
}

export interface RecommendationExplainability {
  technical: { en: string; ar: string };
  fundamental: { en: string; ar: string };
  news: { en: string; ar: string };
  sector: { en: string; ar: string };
  macro: { en: string; ar: string };
  oilImpact: { en: string; ar: string; score: number };
  ratesImpact: { en: string; ar: string; score: number };
  economicEvent: { en: string; ar: string };
  correlation: { en: string; ar: string };
  risk: { en: string; ar: string };
  confidence: { en: string; ar: string };
  invalidation: { en: string; ar: string };
  monitorNext: { en: string; ar: string };
  reviewBy: string;
  dataSource: "live" | "demo";
  provider?: string;
}

export interface WhyNowEngine {
  whyNow: { en: string; ar: string };
  whyNotYesterday: { en: string; ar: string };
  whyNotTomorrow: { en: string; ar: string };
  whatChanged: { en: string; ar: string };
}

export interface WhatMustChangeRule {
  id: string;
  conditionEn: string;
  conditionAr: string;
  newRecommendation: Recommendation;
  triggerEn: string;
  triggerAr: string;
}

export interface MarketConsensus {
  consensusPct: number;
  sources: {
    id: string;
    labelEn: string;
    labelAr: string;
    score: number;
    direction: Recommendation;
    weight: number;
  }[];
  summaryEn: string;
  summaryAr: string;
}

export interface CrossMarketChain {
  id: string;
  titleEn: string;
  titleAr: string;
  nodes: { labelEn: string; labelAr: string }[];
  correlationScore: number;
  impactScore: number;
  expectedDirection: "up" | "down" | "mixed";
  confidence: number;
}

export interface CrossMarketRelation {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  driver: string;
  affected: string;
  impactScore: number;
  correlation: number;
  direction: "positive" | "negative" | "mixed";
}

export interface NormalizedAssetProfile {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  region: string;
  sector?: string;
  dataSource: "live" | "demo";
  provider?: string;
}

export interface AIQualityScore {
  confidence: number;
  providerCount: number;
  newsScore: number;
  technicalScore: number;
  fundamentalScore: number;
  macroScore: number;
  liquidityScore: number;
  riskScore: number;
  dataStatus: string;
  validationWarning?: string;
  summaryEn: string;
  summaryAr: string;
}

export interface AIAnalysis {
  symbol: string;
  assetClass: AssetClass;
  generatedAt: string;
  recommendation: Recommendation;
  confidence: number;
  riskLevel: RiskLevel;
  signalScore: number;
  technical: TechnicalAnalysis;
  newsImpact: NewsImpact[];
  sectorImpact: { sector: string; impact: number; summary: string };
  marketCorrelation: { index: string; correlation: number }[];
  macroFactors: {
    oilImpact: number;
    ratesImpact: number;
    economicEvents: EconomicEvent[];
  };
  explainability: RecommendationExplainability;
  contributions?: ExplainabilityContributions;
  qualityScore?: AIQualityScore;
  whyNow: WhyNowEngine;
  whatMustChange: WhatMustChangeRule[];
  recommendationTransitions: RecommendationTransition[];
  marketConsensus: MarketConsensus;
  explanation: string[];
  explanationAr?: string[];
  complianceNote: string;
  complianceNoteAr?: string;
}

export interface RiskSettings {
  stopLossPct: number;
  takeProfitPct: number;
  maxPositionPct: number;
  dailyLossLimitPct: number;
  riskPerTradePct: number;
  maxOpenPositions: number;
  paperTradingOnly: boolean;
  realBrokerExecution: boolean;
}

export interface RiskAssessment {
  symbol: string;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  withinLimits: boolean;
  violations: string[];
}

export interface LearningRecord {
  id: string;
  symbol: string;
  assetClass?: AssetClass;
  recommendation: Recommendation;
  predictedDirection: "up" | "down" | "flat";
  actualDirection: "up" | "down" | "flat";
  confidence: number;
  riskLevel?: RiskLevel;
  reasons?: string[];
  priceAtRecommendation: number;
  pricesAfter?: { h1?: number; d1?: number; w1?: number; m1?: number };
  returnPct?: number;
  wasCorrect: boolean;
  mistake?: string;
  mistakeCategory?: "technical" | "news" | "macro" | "timing" | "risk" | "other";
  lessonLearned?: string;
  improvedRule?: string;
  dataSource?: "live" | "demo";
  recordedAt: string;
  resolvedAt?: string;
}

export interface ConfidenceAnalytics {
  winRateByConfidence: { range: string; total: number; correct: number; winRate: number }[];
  winRateByMarket: { market: string; total: number; correct: number; winRate: number }[];
  winRateByStrategy: { strategy: string; total: number; correct: number; winRate: number }[];
  winRateByRisk: { risk: RiskLevel; total: number; correct: number; winRate: number }[];
  avgReturnAfterRecommendation: number;
  accuracyTrend: { period: string; accuracy: number }[];
  bestType: { recommendation: Recommendation; winRate: number };
  worstType: { recommendation: Recommendation; winRate: number };
}

export interface PortfolioSimulationResult {
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  bestTrade: { symbol: string; pnlPct: number } | null;
  worstTrade: { symbol: string; pnlPct: number } | null;
  equityCurve: { date: string; equity: number }[];
  buyHoldReturnPct: number;
  indexBenchmarkReturnPct: number;
  trades: number;
  winRate: number;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  userDecision: Recommendation | "no_action";
  aiRecommendation: Recommendation;
  userReason: string;
  exitReason?: string;
  userNotes: string;
  emotion?: "confident" | "fearful" | "greedy" | "neutral" | "uncertain";
  mistakeTags?: string[];
  lessonsLearned?: string;
  followedAi: boolean;
  outcome?: "pending" | "profit" | "loss" | "neutral";
  createdAt: string;
}

export interface RecommendationTransition {
  from: Recommendation;
  to: Recommendation;
  conditionEn: string;
  conditionAr: string;
  triggerEn: string;
  triggerAr: string;
}

export interface EventImpactItem {
  id: string;
  driverEn: string;
  driverAr: string;
  impacts: { targetEn: string; targetAr: string; direction: "up" | "down" | "mixed"; score: number }[];
  summaryEn: string;
  summaryAr: string;
}

export interface AIDebateAgent {
  role: "bull" | "bear" | "risk";
  labelEn: string;
  labelAr: string;
  argumentEn: string;
  argumentAr: string;
  score: number;
}

export interface AIDebateResult {
  symbol: string;
  recommendation: Recommendation;
  confidence: number;
  agents: AIDebateAgent[];
  finalVerdictEn: string;
  finalVerdictAr: string;
}

export interface RiskGuardianState {
  emergencyStop: boolean;
  dailyLossBreached: boolean;
  allowedMarkets: AssetClass[];
  maxRiskPerTradePct: number;
  dailyLossLimitPct: number;
  blockedReasons: string[];
  canTrade: boolean;
}

export interface BotActivityLog {
  id: string;
  at: string;
  action: "scan" | "buy" | "sell" | "stop_loss" | "take_profit" | "blocked" | "schedule";
  symbol?: string;
  detailEn: string;
  detailAr: string;
  success: boolean;
}

export interface ExplainabilityContributions {
  technicalPct: number;
  newsPct: number;
  macroPct: number;
  sectorPct: number;
  riskPct: number;
  whyNowEn: string;
  whyNowAr: string;
  invalidationEn: string;
  invalidationAr: string;
  nextReviewAt: string;
}

export interface AgentOpinion {
  agentId: string;
  nameEn: string;
  nameAr: string;
  stance: Recommendation;
  confidence: number;
  reasonsEn: string[];
  reasonsAr: string[];
}

export interface MultiAgentConsensusResult {
  agents: AgentOpinion[];
  consensusScore: number;
  finalDecision: Recommendation;
  conflicts: { agentA: string; agentB: string; issueEn: string; issueAr: string }[];
  decisionRationaleEn: string;
  decisionRationaleAr: string;
  generatedAt: string;
}

export interface PortfolioAllocation {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  targetWeightPct: number;
  currentWeightPct: number;
  sector: string;
  riskBand: RiskLevel;
}

export interface PortfolioManagerState {
  totalEquity: number;
  cashPct: number;
  allocations: PortfolioAllocation[];
  sectorExposure: { sector: string; pct: number }[];
  drawdownPct: number;
  totalPnlPct: number;
  concentrationRisk: RiskLevel;
  rebalanceActions: { symbol: string; actionEn: string; actionAr: string }[];
  updatedAt: string;
}

export interface GlobalMarketBrainInsight {
  id: string;
  titleEn: string;
  titleAr: string;
  markets: string[];
  drivers: string[];
  impactEn: string;
  impactAr: string;
  correlationScore: number;
  severity: RiskLevel;
}

export interface GlobalMarketBrain {
  regions: { id: string; nameEn: string; nameAr: string; health: number; trend: Recommendation }[];
  crossMarketInsights: GlobalMarketBrainInsight[];
  macroDrivers: {
    oil: { value: string; impactEn: string; impactAr: string };
    rates: { value: string; impactEn: string; impactAr: string };
    usd: { value: string; impactEn: string; impactAr: string };
    gold: { value: string; impactEn: string; impactAr: string };
    cryptoSentiment: { value: string; impactEn: string; impactAr: string };
    saudiSector: { value: string; impactEn: string; impactAr: string };
  };
  updatedAt: string;
}

export interface ResearchNewsItem {
  id: string;
  headlineEn: string;
  headlineAr: string;
  summaryEn: string;
  summaryAr: string;
  affectedAssets: string[];
  expectedImpactEn: string;
  expectedImpactAr: string;
  sentiment: "positive" | "negative" | "neutral";
  publishedAt: string;
  dataSource: "live" | "demo";
}

export interface StrategyMarketplaceItem {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bestMarket: string;
  winRate: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  riskReward: number;
  strengthsEn: string[];
  strengthsAr: string[];
  weaknessesEn: string[];
  weaknessesAr: string[];
}

export interface ImprovementRecord {
  id: string;
  category: string;
  mistakeEn: string;
  mistakeAr: string;
  suggestedRuleEn: string;
  suggestedRuleAr: string;
  backtestImprovementPct: number;
  accepted: boolean;
  createdAt: string;
}

export interface GuardianProCheck {
  id: string;
  labelEn: string;
  labelAr: string;
  passed: boolean;
  severity: RiskLevel;
  detailEn: string;
  detailAr: string;
}

export interface GuardianProResult {
  allowed: boolean;
  checks: GuardianProCheck[];
  suggestedPositionSizePct: number;
  summaryEn: string;
  summaryAr: string;
}

export interface CEODashboardData {
  topOpportunities: OpportunityItem[];
  topRisks: { titleEn: string; titleAr: string; severity: RiskLevel; detailEn: string; detailAr: string }[];
  botStatus: AutoPaperBotStatus;
  paperPerformance: { totalPnlPct: number; todayPnlPct: number; winRate: number; trades: number };
  marketHealth: MarketHealthDashboard;
  providerStatus: { live: number; demo: number; pendingKeys: string[] };
  portfolioSimulation: PortfolioSimulationResult;
  topRecommendations: { symbol: string; recommendation: Recommendation; confidence: number }[];
  alerts: Alert[];
  compliance: ComplianceConfig;
  generatedAt: string;
}

export type BotLifecycleStatus = "running" | "stopped" | "paused" | "error";

export interface AutoPaperBotStatus {
  enabled: boolean;
  paused: boolean;
  running: boolean;
  lifecycleStatus: BotLifecycleStatus;
  mode: "demo";
  scheduleMinutes: number;
  maxTradesPerDay: number;
  tradesToday: number;
  maxRiskPerTradePct: number;
  dailyLossLimitPct: number;
  emergencyStop: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastScannedSymbols: string[];
  lastTrade?: { symbol: string; side: string; at: string };
  lastError?: string;
  consecutiveErrors: number;
  openPositions: number;
  todayPnlPct: number;
  activityLog: BotActivityLog[];
  guardian: RiskGuardianState;
  storageBackend: "supabase" | "file" | "memory";
  cronEnabled: boolean;
  paperOnly: boolean;
}

export interface ArabicMarketBrief {
  headlineAr: string;
  headlineEn: string;
  focusAreas: { titleAr: string; titleEn: string; detailAr: string; detailEn: string }[];
  saudiHighlights: { symbol: string; nameAr: string; noteAr: string; noteEn: string }[];
}

export interface MarketHealthMetric {
  id: string;
  labelEn: string;
  labelAr: string;
  value: number;
  status: "bullish" | "bearish" | "neutral";
  detailEn: string;
  detailAr: string;
}

export interface MarketHealthDashboard {
  metrics: MarketHealthMetric[];
  score: MarketHealthScore;
  updatedAt: string;
}

export interface MarketHealthScore {
  score: number;
  labelEn: string;
  labelAr: string;
  breakdown: { factorEn: string; factorAr: string; points: number; maxPoints: number }[];
}

export interface SmartMoneyFlowNode {
  asset: string;
  assetAr: string;
  flowPct: number;
  direction: "in" | "out" | "neutral";
}

export interface SmartMoneyFlowMap {
  period: string;
  nodes: SmartMoneyFlowNode[];
  summaryEn: string;
  summaryAr: string;
}

export interface ScenarioResult {
  id: string;
  questionEn: string;
  questionAr: string;
  impacts: { marketEn: string; marketAr: string; direction: "up" | "down" | "mixed"; magnitudePct: number }[];
  summaryEn: string;
  summaryAr: string;
}

export interface OpportunityItem {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  type: "momentum" | "volume" | "rotation" | "undervalued" | "hidden";
  score: number;
  reasonEn: string;
  reasonAr: string;
}

export interface DataQualityScore {
  score: number;
  freshnessEn: string;
  freshnessAr: string;
  missingProviders: string[];
  delayedData: boolean;
  confidenceEn: string;
  confidenceAr: string;
  apiHealthPct: number;
  breakdown: { factorEn: string; factorAr: string; points: number; maxPoints: number }[];
}

export interface StrategyLabResult {
  symbol: string;
  strategies: {
    id: string;
    nameEn: string;
    nameAr: string;
    winRate: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpeLike: number;
    trades: number;
  }[];
}

export interface LearningStats {
  totalPredictions: number;
  correct: number;
  accuracy: number;
  recentMistakes: LearningRecord[];
  improvementTrend: number;
}

export interface Alert {
  id: string;
  channel: AlertChannel;
  type:
    | "signal"
    | "risk"
    | "price"
    | "system"
    | "market_event"
    | "news"
    | "economic"
    | "portfolio";
  title: string;
  message: string;
  symbol?: string;
  severity: RiskLevel;
  read: boolean;
  createdAt: string;
  whatsappReady: boolean;
  emailReady?: boolean;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: "long";
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  openedAt: string;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  status: "filled" | "rejected";
  reason?: string;
  createdAt: string;
}

export interface PaperPortfolio {
  cash: number;
  initialCash: number;
  equity: number;
  totalPnl: number;
  totalPnlPct: number;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
  orders: PaperOrder[];
  missedSignals: { symbol: string; recommendation: Recommendation; at: string; reason: string }[];
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  symbol: string;
  recommendation: Recommendation;
  confidence: number;
  riskLevel: RiskLevel;
  dataSource: "live" | "demo";
  provider?: string;
  locale: "ar" | "en";
  createdAt: string;
  summary: string;
}

export interface ComplianceConfig {
  paperTradingOnly: boolean;
  realBrokerExecution: boolean;
  complianceModeLocked: boolean;
  financialAdviceDisclaimer: string;
  financialAdviceDisclaimerAr: string;
  jurisdictionNotice: string;
  jurisdictionNoticeAr: string;
  dataMode: "mock" | "live" | "mixed";
}

export interface MarketOverview {
  mode: "mock" | "live" | "mixed";
  assets: MarketAsset[];
  indices: MarketAsset[];
  topGainers: MarketAsset[];
  topLosers: MarketAsset[];
  updatedAt: string;
  demoCount?: number;
  liveCount?: number;
}

export interface DataAdapter {
  id: string;
  name: string;
  assetClasses: AssetClass[];
  status: "mock" | "live" | "ready" | "requires_key" | "requires_oauth" | "disabled";
  hasApiKey: boolean;
  description: string;
}
