import { describe, expect, it } from "vitest";
import {
  OPPORTUNITY_SCORE_WEIGHTS,
  computeOpportunityScore,
  filterPremiumGrades,
  gradeFromScore,
  isPremiumGrade,
} from "./opportunity-score";

describe("opportunity score formula", () => {
  it("applies weighted formula correctly", () => {
    const result = computeOpportunityScore({
      moneyFlow: 80,
      technical: 70,
      fundamentals: 75,
      newsSentiment: 60,
      macro: 65,
      risk: 30,
    });

    const expected =
      80 * OPPORTUNITY_SCORE_WEIGHTS.moneyFlow +
      70 * OPPORTUNITY_SCORE_WEIGHTS.technical +
      75 * OPPORTUNITY_SCORE_WEIGHTS.fundamentals +
      60 * OPPORTUNITY_SCORE_WEIGHTS.newsSentiment +
      65 * OPPORTUNITY_SCORE_WEIGHTS.macro +
      70 * OPPORTUNITY_SCORE_WEIGHTS.riskManagement;

    expect(result.total).toBe(Number(expected.toFixed(1)));
    expect(result.riskManagement).toBe(70);
    expect(result.grade).toBe(gradeFromScore(result.total));
  });

  it("grades opportunities on 0–100 scale", () => {
    expect(gradeFromScore(95)).toBe("A+");
    expect(gradeFromScore(85)).toBe("A");
    expect(gradeFromScore(75)).toBe("B");
    expect(gradeFromScore(65)).toBe("C");
    expect(gradeFromScore(55)).toBe("Avoid");
  });

  it("filters premium A+ and A grades", () => {
    const items = [
      { symbol: "A", grade: gradeFromScore(92) },
      { symbol: "B", grade: gradeFromScore(82) },
      { symbol: "C", grade: gradeFromScore(72) },
    ] as const;

    const premium = filterPremiumGrades([...items]);
    expect(premium).toHaveLength(2);
    expect(isPremiumGrade("A+")).toBe(true);
    expect(isPremiumGrade("B")).toBe(false);
  });
});
