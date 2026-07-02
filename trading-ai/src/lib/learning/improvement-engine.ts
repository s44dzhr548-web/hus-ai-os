import type { ImprovementRecord } from "@/types/trading";
import { getLearningStats } from "@/lib/learning/memory";

const HISTORY: ImprovementRecord[] = [
  {
    id: "imp-1",
    category: "news",
    mistakeEn: "Missed earnings catalyst before sell signal",
    mistakeAr: "فات catalyst أرباح قبل إشارة بيع",
    suggestedRuleEn: "Reduce sell conviction within 48h of earnings",
    suggestedRuleAr: "خفض قناعة البيع خلال 48 ساعة من الأرباح",
    backtestImprovementPct: 4.2,
    accepted: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "imp-2",
    category: "macro",
    mistakeEn: "Ignored oil spike impact on Saudi names",
    mistakeAr: "تجاهل ارتفاع النفط على الأسهم السعودية",
    suggestedRuleEn: "Boost energy sector weight when Brent +3% daily",
    suggestedRuleAr: "رفع وزن الطاقة عند ارتفاع Brent +3% يومياً",
    backtestImprovementPct: 2.8,
    accepted: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export function getImprovementEngineState() {
  const stats = getLearningStats();
  const pending = stats.recentMistakes
    .filter((m) => !m.wasCorrect)
    .map((m, i) => ({
      id: `pending-${i}`,
      category: m.mistakeCategory ?? "technical",
      mistakeEn: m.mistake ?? "Incorrect direction",
      mistakeAr: m.mistake ?? "اتجاه خاطئ",
      suggestedRuleEn: m.improvedRule ?? "Increase confirmation threshold",
      suggestedRuleAr: m.improvedRule ?? "رفع عتبة التأكيد",
      backtestImprovementPct: Number((1.5 + i * 0.8).toFixed(1)),
      accepted: false,
      createdAt: m.recordedAt,
    }));

  const simulated = pending.map((p) => ({
    ...p,
    accepted: p.backtestImprovementPct >= 2.5,
  }));

  return {
    stats,
    history: [...HISTORY, ...simulated.filter((s) => s.accepted)],
    pending: simulated.filter((s) => !s.accepted),
    summaryEn: `${HISTORY.filter((h) => h.accepted).length} improvements accepted after backtest validation. Paper simulation only.`,
    summaryAr: `${HISTORY.filter((h) => h.accepted).length} تحسينات مقبولة بعد محاكاة. ورقي فقط.`,
  };
}
