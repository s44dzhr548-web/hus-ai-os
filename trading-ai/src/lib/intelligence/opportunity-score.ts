/** Weighted Opportunity Score — Smart Money Flow Opportunities */

export const OPPORTUNITY_SCORE_WEIGHTS = {
  moneyFlow: 0.25,
  technical: 0.2,
  fundamentals: 0.2,
  newsSentiment: 0.15,
  macro: 0.1,
  riskManagement: 0.1,
} as const;

export type OpportunityGrade = "A+" | "A" | "B" | "C" | "Avoid";

export interface OpportunityScoreInput {
  moneyFlow: number;
  technical: number;
  fundamentals: number;
  newsSentiment: number;
  macro: number;
  /** Raw risk score 0–100 (higher = more risk). Formula uses 100 − risk. */
  risk: number;
}

export interface OpportunityScoreResult {
  moneyFlow: number;
  technical: number;
  fundamentals: number;
  newsSentiment: number;
  macro: number;
  risk: number;
  /** Risk-management component used in formula (100 − raw risk). */
  riskManagement: number;
  total: number;
  grade: OpportunityGrade;
}

export function computeOpportunityScore(input: OpportunityScoreInput): OpportunityScoreResult {
  const moneyFlow = clampScore(input.moneyFlow);
  const technical = clampScore(input.technical);
  const fundamentals = clampScore(input.fundamentals);
  const newsSentiment = clampScore(input.newsSentiment);
  const macro = clampScore(input.macro);
  const risk = clampScore(input.risk);
  const riskManagement = clampScore(100 - risk);

  const total = Number(
    (
      moneyFlow * OPPORTUNITY_SCORE_WEIGHTS.moneyFlow +
      technical * OPPORTUNITY_SCORE_WEIGHTS.technical +
      fundamentals * OPPORTUNITY_SCORE_WEIGHTS.fundamentals +
      newsSentiment * OPPORTUNITY_SCORE_WEIGHTS.newsSentiment +
      macro * OPPORTUNITY_SCORE_WEIGHTS.macro +
      riskManagement * OPPORTUNITY_SCORE_WEIGHTS.riskManagement
    ).toFixed(1)
  );

  return {
    moneyFlow: round1(moneyFlow),
    technical: round1(technical),
    fundamentals: round1(fundamentals),
    newsSentiment: round1(newsSentiment),
    macro: round1(macro),
    risk: round1(risk),
    riskManagement: round1(riskManagement),
    total,
    grade: gradeFromScore(total),
  };
}

export function gradeFromScore(score: number): OpportunityGrade {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "Avoid";
}

export function isPremiumGrade(grade: OpportunityGrade): boolean {
  return grade === "A+" || grade === "A";
}

export function filterPremiumGrades<T extends { grade: OpportunityGrade }>(items: T[]): T[] {
  return items.filter((item) => isPremiumGrade(item.grade));
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}
