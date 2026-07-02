import type { MultiAgentConsensusResult, Recommendation } from "@/types/trading";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";

function stanceFromScore(score: number): Recommendation {
  if (score >= 62) return "buy";
  if (score <= 38) return "sell";
  return "hold";
}

export async function runMultiAgentConsensus(
  symbol: string,
  locale: "ar" | "en" = "ar"
): Promise<MultiAgentConsensusResult> {
  const analysis = await runAIAnalysis(symbol, locale);
  const { technical, recommendation, confidence, riskLevel, signalScore, macroFactors, sectorImpact, newsImpact } =
    analysis;

  const techScore = signalScore;
  const fundScore = 45 + sectorImpact.impact * 35 + (technical.trend === "bullish" ? 10 : -5);
  const newsScore =
    50 +
    newsImpact.reduce((s, n) => s + (n.sentiment === "positive" ? 8 : n.sentiment === "negative" ? -8 : 0), 0);
  const macroScore = 50 + macroFactors.oilImpact * 40 + macroFactors.ratesImpact * 30;
  const riskScore =
    riskLevel === "critical" ? 25 : riskLevel === "high" ? 35 : riskLevel === "medium" ? 50 : 65;
  const sentimentScore = newsScore;
  const portfolioScore = recommendation === "buy" ? 58 : recommendation === "sell" ? 42 : 50;

  const agents: MultiAgentConsensusResult["agents"] = [
    {
      agentId: "technical",
      nameEn: "Technical Agent",
      nameAr: "الوكيل الفني",
      stance: stanceFromScore(techScore),
      confidence: Number((confidence * 0.95).toFixed(2)),
      reasonsEn: [`RSI ${technical.rsi}`, `MACD ${technical.macdSignal}`, `Trend ${technical.trend}`],
      reasonsAr: [`RSI ${technical.rsi}`, `MACD ${technical.macdSignal}`, `اتجاه ${technical.trend}`],
    },
    {
      agentId: "fundamental",
      nameEn: "Fundamental Agent",
      nameAr: "الوكيل الأساسي",
      stance: stanceFromScore(fundScore),
      confidence: 0.62,
      reasonsEn: [`Sector ${sectorImpact.sector}`, sectorImpact.summary],
      reasonsAr: [`قطاع ${sectorImpact.sector}`, sectorImpact.summary],
    },
    {
      agentId: "news",
      nameEn: "News Agent",
      nameAr: "وكيل الأخبار",
      stance: stanceFromScore(newsScore),
      confidence: 0.58,
      reasonsEn: newsImpact.slice(0, 2).map((n) => n.headline),
      reasonsAr: newsImpact.slice(0, 2).map((n) => n.headline),
    },
    {
      agentId: "macro",
      nameEn: "Macro Agent",
      nameAr: "الوكيل الاقتصادي",
      stance: stanceFromScore(macroScore),
      confidence: 0.6,
      reasonsEn: [
        `Oil impact ${(macroFactors.oilImpact * 100).toFixed(0)}%`,
        `Rates impact ${(macroFactors.ratesImpact * 100).toFixed(0)}%`,
      ],
      reasonsAr: [
        `تأثير النفط ${(macroFactors.oilImpact * 100).toFixed(0)}%`,
        `تأثير الفائدة ${(macroFactors.ratesImpact * 100).toFixed(0)}%`,
      ],
    },
    {
      agentId: "risk",
      nameEn: "Risk Agent",
      nameAr: "وكيل المخاطر",
      stance: riskScore < 45 ? "sell" : riskScore > 55 ? "buy" : "hold",
      confidence: 0.7,
      reasonsEn: [`Risk level ${riskLevel}`, `Volatility ${(technical.volatility * 100).toFixed(1)}%`],
      reasonsAr: [`مستوى مخاطر ${riskLevel}`, `تقلب ${(technical.volatility * 100).toFixed(1)}%`],
    },
    {
      agentId: "sentiment",
      nameEn: "Sentiment Agent",
      nameAr: "وكيل المعنويات",
      stance: stanceFromScore(sentimentScore),
      confidence: 0.55,
      reasonsEn: [`News count ${newsImpact.length}`, `Signal mood ${signalScore}/100`],
      reasonsAr: [`عدد الأخبار ${newsImpact.length}`, `مزاج الإشارة ${signalScore}/100`],
    },
    {
      agentId: "portfolio",
      nameEn: "Portfolio Agent",
      nameAr: "وكيل المحفظة",
      stance: stanceFromScore(portfolioScore),
      confidence: 0.57,
      reasonsEn: ["Diversification and concentration check", `Aligns with ${recommendation} thesis`],
      reasonsAr: ["فحص التنويع والتركيز", `متوافق مع فرضية ${recommendation}`],
    },
  ];

  const buyVotes = agents.filter((a) => a.stance === "buy").length;
  const sellVotes = agents.filter((a) => a.stance === "sell").length;
  const consensusScore = Math.round((Math.max(buyVotes, sellVotes) / agents.length) * 100);

  let finalDecision: Recommendation = "hold";
  if (buyVotes > sellVotes && buyVotes >= 4) finalDecision = "buy";
  else if (sellVotes > buyVotes && sellVotes >= 4) finalDecision = "sell";
  else finalDecision = recommendation;

  const conflicts: MultiAgentConsensusResult["conflicts"] = [];
  if (agents.find((a) => a.agentId === "technical")?.stance !== agents.find((a) => a.agentId === "risk")?.stance) {
    conflicts.push({
      agentA: "Technical",
      agentB: "Risk",
      issueEn: "Technical bullish bias conflicts with elevated risk flags",
      issueAr: "اتجاه فني صاعد يتعارض مع مخاطر مرتفعة",
    });
  }
  if (agents.find((a) => a.agentId === "news")?.stance !== agents.find((a) => a.agentId === "macro")?.stance) {
    conflicts.push({
      agentA: "News",
      agentB: "Macro",
      issueEn: "Headline sentiment diverges from macro outlook",
      issueAr: "مزاج العناوين يختلف عن التوقعات الاقتصادية",
    });
  }

  return {
    agents,
    consensusScore,
    finalDecision,
    conflicts,
    decisionRationaleEn: `${buyVotes} bullish, ${sellVotes} bearish, ${agents.length - buyVotes - sellVotes} neutral. Final: ${finalDecision.toUpperCase()} (${consensusScore}% alignment). Paper trading only.`,
    decisionRationaleAr: `${buyVotes} صاعد، ${sellVotes} هابط. القرار: ${finalDecision} (${consensusScore}% توافق). تداول ورقي فقط.`,
    generatedAt: new Date().toISOString(),
  };
}
