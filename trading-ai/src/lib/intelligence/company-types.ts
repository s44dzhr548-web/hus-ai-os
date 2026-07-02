import type { AssetClass, Recommendation, RiskLevel, TechnicalAnalysis } from "@/types/trading";

export type ProfileDataBadge = "live" | "cached" | "seeded" | "demo";

export interface CompanyOverview {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  market: string;
  description: string;
  website?: string;
  marketCap?: number;
  employees?: number;
  logo: { initials: string; color: string };
}

export interface CompanyQuoteDetail {
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  high52w?: number;
  low52w?: number;
  dayChangePct: number;
  weekChangePct: number;
  monthChangePct: number;
  yearChangePct: number;
  currency: string;
  dataSource: ProfileDataBadge;
  provider: string;
  lastUpdated: string;
}

export interface CompanyAIRecommendation {
  recommendation: Recommendation;
  aiScore: number;
  confidence: number;
  riskLevel: RiskLevel;
  riskScore: number;
  expectedUpsidePct: number;
  expectedDownsidePct: number;
  entryZone: { low: number; high: number };
  exitZone: { low: number; high: number };
  stopLoss: number;
  takeProfit: number;
  reviewBy: string;
  dataSource: ProfileDataBadge;
}

export interface CompanyWhySelected {
  technical: string[];
  fundamental: string[];
  news: string[];
  sector: string[];
  macro: string[];
  oilImpact: string;
  ratesImpact: string;
  correlation: string[];
  invalidation: string[];
}

export interface CompanyFinancials {
  revenue?: number;
  netIncome?: number;
  eps?: number;
  pe?: number;
  peg?: number;
  debt?: number;
  cashFlow?: number;
  grossMarginPct?: number;
  operatingMarginPct?: number;
  dividendYieldPct?: number;
  nextEarningsDate?: string;
  dataSource: ProfileDataBadge;
  provider: string;
  note?: string;
}

export interface CompanyAnnouncement {
  id: string;
  title: string;
  date: string;
  type: string;
  url?: string;
  summary: string;
  dataSource: ProfileDataBadge;
}

export interface CompanyNewsItem {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  impactScore: number;
  url?: string;
}

export interface CompanyRiskAssessment {
  volatilityRisk: number;
  liquidityRisk: number;
  sectorRisk: number;
  correlationRisk: number;
  newsRisk: number;
  suggestedPositionPct: number;
  summary: string;
  riskLevel: RiskLevel;
}

export interface ProviderLinkStatus {
  id: string;
  label: string;
  status: "connected" | "missing" | "demo_fallback";
  lastUpdated?: string;
  dataQualityScore: number;
}

export interface RelatedAssetLink {
  symbol: string;
  displaySymbol: string;
  name: string;
  relation: string;
}

export interface CompanyIntelligenceProfile {
  overview: CompanyOverview;
  quote: CompanyQuoteDetail;
  ai: CompanyAIRecommendation;
  why: CompanyWhySelected;
  financials: CompanyFinancials;
  announcements: CompanyAnnouncement[];
  news: CompanyNewsItem[];
  technical: TechnicalAnalysis;
  risk: CompanyRiskAssessment;
  providers: ProviderLinkStatus[];
  related: RelatedAssetLink[];
  executionMode: "paper_only";
  brokerEnabled: false;
  persistenceConfigured: boolean;
}
