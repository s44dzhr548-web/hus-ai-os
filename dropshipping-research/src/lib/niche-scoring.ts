/**
 * Niche scoring engine — pure functions, no external API required for MVP demo.
 * Score = (demand * margin) / (competition + 1)
 */
export interface NicheInput {
  name: string;
  demandScore: number; // 0-100
  avgMarginPct: number; // 0-100
  competitionScore: number; // 0-100, higher = more competition
  trendDirection: "up" | "flat" | "down";
}

export interface NicheReport {
  name: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  recommendation: string;
}

export function scoreNiche(input: NicheInput): NicheReport {
  const trendMultiplier =
    input.trendDirection === "up" ? 1.2 : input.trendDirection === "down" ? 0.8 : 1;
  const raw =
    ((input.demandScore / 100) * (input.avgMarginPct / 100) * 100) /
    (input.competitionScore / 100 + 1);
  const score = Number((raw * trendMultiplier).toFixed(2));

  let grade: NicheReport["grade"] = "D";
  if (score >= 40) grade = "A";
  else if (score >= 25) grade = "B";
  else if (score >= 15) grade = "C";

  const recommendation =
    grade === "A"
      ? "Strong opportunity — prioritize supplier research"
      : grade === "B"
        ? "Viable — validate with sample orders"
        : grade === "C"
          ? "Marginal — monitor trends"
          : "Avoid — high competition or low margin";

  return { name: input.name, score, grade, recommendation };
}

export function rankNiches(inputs: NicheInput[]): NicheReport[] {
  return inputs.map(scoreNiche).sort((a, b) => b.score - a.score);
}

/** Demo data for MVP dashboard */
export const DEMO_NICHES: NicheInput[] = [
  { name: "Pet grooming tools", demandScore: 78, avgMarginPct: 45, competitionScore: 55, trendDirection: "up" },
  { name: "Home office ergonomics", demandScore: 65, avgMarginPct: 35, competitionScore: 70, trendDirection: "flat" },
  { name: "Eco kitchen products", demandScore: 72, avgMarginPct: 40, competitionScore: 48, trendDirection: "up" },
  { name: "Phone accessories", demandScore: 85, avgMarginPct: 25, competitionScore: 90, trendDirection: "down" },
  { name: "Fitness resistance bands", demandScore: 60, avgMarginPct: 50, competitionScore: 65, trendDirection: "flat" },
];
