import type { AIDebateResult, Recommendation } from "@/types/trading";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";

export async function runAIDebate(symbol: string, locale: "ar" | "en" = "ar"): Promise<AIDebateResult> {
  const analysis = await runAIAnalysis(symbol, locale);
  const { technical, recommendation, confidence, riskLevel, signalScore, macroFactors, sectorImpact } = analysis;

  const bullScore = recommendation === "buy" ? signalScore : recommendation === "hold" ? 55 : 35;
  const bearScore = recommendation === "sell" ? 100 - signalScore : recommendation === "hold" ? 45 : 25;
  const riskScore = riskLevel === "critical" ? 90 : riskLevel === "high" ? 75 : riskLevel === "medium" ? 50 : 30;

  const agents: AIDebateResult["agents"] = [
    {
      role: "bull",
      labelEn: "Bullish Agent",
      labelAr: "الوكيل الصاعد",
      argumentEn: `Trend ${technical.trend} with RSI ${technical.rsi}. Sector ${sectorImpact.sector} supportive. MACD ${technical.macdSignal}. Upside to resistance ${technical.resistance}.`,
      argumentAr: `اتجاه ${technical.trend} مع RSI ${technical.rsi}. قطاع ${sectorImpact.sector} داعم. MACD ${technical.macdSignal}. صعود نحو ${technical.resistance}.`,
      score: bullScore,
    },
    {
      role: "bear",
      labelEn: "Bearish Agent",
      labelAr: "الوكيل الهابط",
      argumentEn: `Volatility ${(technical.volatility * 100).toFixed(1)}%. Support ${technical.support} at risk. Oil/rates sensitivity ${(macroFactors.oilImpact * 100).toFixed(0)}%/${(Math.abs(macroFactors.ratesImpact) * 100).toFixed(0)}%. Downside if macro worsens.`,
      argumentAr: `تقلب ${(technical.volatility * 100).toFixed(1)}%. الدعم ${technical.support} معرض. حساسية نفط/فائدة. هبوط إذا تدهور ماكرو.`,
      score: bearScore,
    },
    {
      role: "risk",
      labelEn: "Risk Agent",
      labelAr: "وكيل المخاطر",
      argumentEn: `Risk level ${riskLevel}. Max adverse move ~${(technical.volatility * 100).toFixed(1)}%. Position sizing should respect ${riskLevel === "high" || riskLevel === "critical" ? "reduced" : "standard"} allocation. Paper only.`,
      argumentAr: `مستوى مخاطر ${riskLevel}. حركة سلبية محتملة ~${(technical.volatility * 100).toFixed(1)}%. حجم مركز ${riskLevel === "high" || riskLevel === "critical" ? "مخفّض" : "عادي"}. ورقي فقط.`,
      score: riskScore,
    },
  ];

  const finalVerdictEn = `After debate: ${recommendation.toUpperCase()} (${(confidence * 100).toFixed(0)}% confidence). Bull ${bullScore} vs Bear ${bearScore}; Risk agent flags ${riskLevel} exposure.`;
  const recAr = recommendation === "buy" ? "شراء" : recommendation === "sell" ? "بيع" : "احتفاظ";
  const finalVerdictAr = `بعد النقاش: ${recAr} (ثقة ${(confidence * 100).toFixed(0)}%). صاعد ${bullScore} vs هابط ${bearScore}; المخاطر ${riskLevel}.`;

  return { symbol, recommendation, confidence, agents, finalVerdictEn, finalVerdictAr };
}
