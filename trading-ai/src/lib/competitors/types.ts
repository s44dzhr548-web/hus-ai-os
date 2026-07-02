export type CompetitorFilterTag =
  | "charting"
  | "ai_signals"
  | "backtesting"
  | "broker_execution"
  | "crypto_bots"
  | "market_research"
  | "fundamental_analysis"
  | "social_trading"
  | "enterprise_data"
  | "no_code_automation"
  | "saudi_market"
  | "arabic_support";

export type PricingType = "free" | "freemium" | "paid" | "enterprise" | "broker_based";

export interface ComparisonMatrixRow {
  platform: string;
  platformAr: string;
  charting: boolean;
  aiSignals: boolean;
  backtesting: boolean;
  newsAnalysis: boolean;
  fundamentalAnalysis: boolean;
  riskManagement: boolean;
  arabicSupport: boolean;
  saudiMarketSupport: boolean;
  multiMarketSupport: boolean;
  autoTrading: boolean;
  paperTrading: boolean;
  husaiOpportunity: string;
  husaiOpportunityAr: string;
  isHusai?: boolean;
}

export interface Competitor {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  mainFeatures: string[];
  mainFeaturesAr: string[];
  strengths: string[];
  strengthsAr: string[];
  weaknesses: string[];
  weaknessesAr: string[];
  targetUsers: string;
  targetUsersAr: string;
  pricingType: PricingType;
  learnFrom: string;
  learnFromAr: string;
  husaiOpportunity: string;
  husaiOpportunityAr: string;
  filters: CompetitorFilterTag[];
  matrix: Omit<ComparisonMatrixRow, "platform" | "platformAr" | "isHusai">;
}

export interface GapItem {
  id: string;
  priority: "high" | "medium" | "low";
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface RoadmapPhase {
  phase: number;
  titleEn: string;
  titleAr: string;
  itemsEn: string[];
  itemsAr: string[];
}
