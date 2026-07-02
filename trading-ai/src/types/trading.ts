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
  recommendation: Recommendation;
  predictedDirection: "up" | "down" | "flat";
  actualDirection: "up" | "down" | "flat";
  confidence: number;
  wasCorrect: boolean;
  mistake?: string;
  recordedAt: string;
  resolvedAt?: string;
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
  type: "signal" | "risk" | "price" | "system" | "market_event";
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
