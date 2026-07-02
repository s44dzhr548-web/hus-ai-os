import type { AssetClass, Recommendation, RiskLevel } from "@/types/trading";
import type { OpportunityGrade } from "./opportunity-score";

export type FlowDirection = "inflow" | "outflow" | "neutral";
export type FlowRegime = "risk_on" | "risk_off" | "mixed";
export type FlowTimeHorizon = "short" | "medium" | "long";
export type OpportunityCategory =
  | "best_inflow"
  | "saudi"
  | "us"
  | "crypto"
  | "gold_oil"
  | "low_risk"
  | "momentum"
  | "early_rotation";

export interface FlowExplanation {
  whyMoving: string;
  evidence: string[];
  beneficiaries: string[];
  hurt: string[];
  reversal: string;
  confidenceNote: string;
}

export interface AssetClassFlow {
  id: string;
  labelEn: string;
  labelAr: string;
  flowPct: number;
  direction: FlowDirection;
  volumeSignal: number;
  institutionalSignal: "accumulation" | "distribution" | "neutral";
  trendType: "temporary" | "trend";
}

export interface SectorFlow {
  sector: string;
  sectorAr: string;
  flowPct: number;
  direction: FlowDirection;
  volumeAnomaly: boolean;
  institutionalSignal: "accumulation" | "distribution" | "neutral";
}

export interface SectorRotation {
  fromSector: string;
  fromSectorAr: string;
  toSector: string;
  toSectorAr: string;
  strength: number;
  reasonEn: string;
  reasonAr: string;
  watchSymbols: string[];
  riskWarningEn: string;
  riskWarningAr: string;
}

export interface FlowOpportunityScore {
  total: number;
  moneyFlow: number;
  technical: number;
  fundamentals: number;
  newsSentiment: number;
  macro: number;
  /** Raw risk 0–100 (higher = more risk). */
  risk: number;
  /** Risk-management component (100 − risk) used in weighted formula. */
  riskManagement: number;
}

export interface FlowOpportunity {
  symbol: string;
  displaySymbol: string;
  name: string;
  market: string;
  sector: string;
  assetClass: AssetClass;
  score: number;
  grade: OpportunityGrade;
  confidence: number;
  riskScore: number;
  riskLevel: RiskLevel;
  expectedReturnPct: number;
  timeHorizon: FlowTimeHorizon;
  recommendation: Recommendation;
  flowDirection: FlowDirection;
  category: OpportunityCategory;
  volumeAnomaly: boolean;
  institutionalSignal: "accumulation" | "distribution" | "neutral";
  breakdown: FlowOpportunityScore;
  explanationEn: FlowExplanation;
  explanationAr: FlowExplanation;
}

export interface FlowDashboardCards {
  strongestInflow: { label: string; labelAr: string; flowPct: number };
  strongestOutflow: { label: string; labelAr: string; flowPct: number };
  topRotation: SectorRotation | null;
  bestOpportunity: FlowOpportunity | null;
  highestRisk: FlowOpportunity | null;
}

export interface FlowRankings {
  bestInflow: FlowOpportunity[];
  saudi: FlowOpportunity[];
  us: FlowOpportunity[];
  crypto: FlowOpportunity[];
  goldOil: FlowOpportunity[];
  lowRisk: FlowOpportunity[];
  highMomentum: FlowOpportunity[];
  earlyRotation: FlowOpportunity[];
}

export interface SmartMoneySnapshot {
  period: string;
  regime: FlowRegime;
  regimeLabelEn: string;
  regimeLabelAr: string;
  assetFlows: AssetClassFlow[];
  sectorInflows: SectorFlow[];
  sectorOutflows: SectorFlow[];
  rotations: SectorRotation[];
  opportunities: FlowOpportunity[];
  rankings: FlowRankings;
  dashboardCards: FlowDashboardCards;
  summaryEn: string;
  summaryAr: string;
  aiExplanationEn: string;
  aiExplanationAr: string;
  dataSource: "live" | "demo" | "mixed";
  executionMode: "paper_only";
  brokerEnabled: false;
  updatedAt: string;
}

export interface AssetFlowProfile {
  symbol: string;
  displaySymbol: string;
  flowDirection: FlowDirection;
  flowStrength: number;
  volumeAnomaly: boolean;
  volumeAnomalyScore: number;
  institutionalSignal: "accumulation" | "distribution" | "neutral";
  sectorRotationImpactEn: string;
  sectorRotationImpactAr: string;
  opportunityScore: number;
  grade: OpportunityGrade;
  breakdown: FlowOpportunityScore;
  confidence: number;
  expectedReturnPct: number;
  timeHorizon: FlowTimeHorizon;
  relatedAffected: { symbol: string; displaySymbol: string; impact: string }[];
  explanationEn: FlowExplanation;
  explanationAr: FlowExplanation;
}
