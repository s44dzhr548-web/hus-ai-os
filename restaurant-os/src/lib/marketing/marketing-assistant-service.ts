import prisma from "@/lib/prisma";
import type { MarketingCampaignGoal, MarketingPlatform } from "@prisma/client";
import { callPlatformOpenAiText } from "@/lib/openai/responses-client";
import { resolvePlatformOpenAiForRole } from "@/lib/platform/openai-brain";
import { assertRestaurantAiAccess } from "@/lib/restaurant-ai-access/service";
import { getMarketingDashboardMetrics } from "@/lib/marketing/dashboard-metrics";
import { getOwnerPlatformCards } from "@/lib/marketing/ads-sync";
import { buildMarketingContext } from "@/lib/marketing/ai-assistant";

const REQUIRED_AD_PLATFORMS = ["SNAPCHAT", "TIKTOK", "GOOGLE", "META"] as const;

export type CampaignPlatformProposal = {
  platform: string;
  labelAr: string;
  budgetPercent: number;
  budgetAmount: number;
  allocationReason: string;
  adCopies: string[];
};

export type MarketingCampaignProposal = {
  name: string;
  goal: MarketingCampaignGoal;
  audience: string;
  totalBudgetSar: number;
  platforms: CampaignPlatformProposal[];
  videoIdea15s: string;
  headline: string;
  cta: string;
  scheduleStart: string;
  scheduleEnd: string;
  kpis: string[];
  summaryAr: string;
  publishBlocked: true;
  publishNote: string;
  source: "openai";
};

const GOAL_IDS: MarketingCampaignGoal[] = [
  "INCREASE_SALES",
  "INCREASE_RESERVATIONS",
  "INCREASE_WHATSAPP",
  "PROMOTE_OFFER",
  "PROMOTE_NEW_MENU",
  "PROMOTE_EVENT",
  "INCREASE_FOLLOWERS",
];

const PLATFORM_LABELS: Record<string, string> = {
  META: "Meta Ads",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok Ads",
  SNAPCHAT: "Snapchat Ads",
  GOOGLE: "Google Ads",
  YOUTUBE: "YouTube",
};

export function isCampaignCreationRequest(message: string): boolean {
  return /حمل|إعلان|اعلان|أنشئ|انشئ|إنشاء|انشاء|روّ?ج|ترويج|campaign|ads?\b|ميزانية.*ري/i.test(
    message
  );
}

function stripJsonFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseGoal(value: unknown): MarketingCampaignGoal {
  const s = String(value || "").toUpperCase();
  if (GOAL_IDS.includes(s as MarketingCampaignGoal)) return s as MarketingCampaignGoal;
  if (/حجز|reservation/i.test(s)) return "INCREASE_RESERVATIONS";
  if (/مبيع|sales/i.test(s)) return "INCREASE_SALES";
  return "INCREASE_RESERVATIONS";
}

function normalizePlatform(value: unknown): string {
  const s = String(value || "").toUpperCase();
  if (s.includes("SNAP") || s.includes("سناب")) return "SNAPCHAT";
  if (s.includes("TIK") || s.includes("تيك")) return "TIKTOK";
  if (s.includes("GOOGLE") || s.includes("جوجل")) return "GOOGLE";
  if (s.includes("META") || s.includes("FACEBOOK") || s.includes("INSTAGRAM")) return "META";
  return s;
}

function parseProposal(raw: string, fallbackBudget: number): MarketingCampaignProposal | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
    const platformsRaw = Array.isArray(parsed.platforms) ? parsed.platforms : [];
    const totalBudget = Number(parsed.totalBudgetSar ?? parsed.budget ?? fallbackBudget) || fallbackBudget;

    const platforms: CampaignPlatformProposal[] = platformsRaw.map((p) => {
      const row = p as Record<string, unknown>;
      const key = normalizePlatform(row.platform);
      const budgetPercent = Number(row.budgetPercent ?? row.percent ?? 0);
      const budgetAmount =
        Number(row.budgetAmount ?? row.amount ?? 0) ||
        Math.round((totalBudget * budgetPercent) / 100);
      const copies = Array.isArray(row.adCopies)
        ? row.adCopies.map(String).filter(Boolean)
        : Array.isArray(row.copies)
          ? row.copies.map(String).filter(Boolean)
          : [];
      while (copies.length < 3) copies.push("");
      return {
        platform: key,
        labelAr: PLATFORM_LABELS[key] || key,
        budgetPercent,
        budgetAmount,
        allocationReason: String(row.allocationReason ?? row.reason ?? "—"),
        adCopies: copies.slice(0, 3),
      };
    });

    if (!platforms.length) return null;

    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);

    return {
      name: String(parsed.name || parsed.campaignName || "حملة جديدة"),
      goal: parseGoal(parsed.goal),
      audience: String(parsed.audience || parsed.targetAudience || "—"),
      totalBudgetSar: totalBudget,
      platforms,
      videoIdea15s: String(parsed.videoIdea15s ?? parsed.videoIdea ?? "—"),
      headline: String(parsed.headline ?? parsed.title ?? "—"),
      cta: String(parsed.cta ?? "احجز الآن"),
      scheduleStart: String(parsed.scheduleStart ?? today.toISOString().slice(0, 10)),
      scheduleEnd: String(parsed.scheduleEnd ?? end.toISOString().slice(0, 10)),
      kpis: Array.isArray(parsed.kpis)
        ? parsed.kpis.map(String)
        : Array.isArray(parsed.metrics)
          ? parsed.metrics.map(String)
          : ["CTR", "CPA", "ROAS", "حجوزات"],
      summaryAr: String(parsed.summaryAr ?? parsed.summary ?? ""),
      publishBlocked: true,
      publishNote: "جاهزة للنشر بعد ربط الحسابات الإعلانية — لن يتم النشر تلقائياً.",
      source: "openai",
    };
  } catch {
    return null;
  }
}

function extractBudgetFromMessage(message: string): number {
  const m = message.match(/(\d+)\s*(?:ري|SAR|ر\.?\s*س)/i);
  return m ? Number(m[1]) : 500;
}

export async function generateCampaignProposal(
  restaurantId: string,
  userMessage: string
): Promise<
  | { ok: true; proposal: MarketingCampaignProposal; modelId: string }
  | { ok: false; error: string }
> {
  const brain = await resolvePlatformOpenAiForRole("MARKETING_MANAGER");
  if (!brain.ok) return { ok: false, error: brain.message };

  const access = await assertRestaurantAiAccess({
    restaurantId,
    roleId: "MARKETING_MANAGER",
  });
  if (!access.ok) return { ok: false, error: access.message };

  const [restaurant, metrics, platformCards] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, nameAr: true, slug: true, welcomeText: true },
    }),
    getMarketingDashboardMetrics(restaurantId),
    getOwnerPlatformCards(restaurantId),
  ]);

  const name = restaurant?.nameAr || restaurant?.name || "المطعم";
  const budget = extractBudgetFromMessage(userMessage);
  const connected = platformCards
    .filter((p) => p.status === "CONNECTED")
    .map((p) => p.key)
    .join("، ");
  const disconnected = REQUIRED_AD_PLATFORMS.filter(
    (k) => !platformCards.some((p) => p.key === k && p.status === "CONNECTED")
  );

  const instructions = `أنت مدير تسويق محترف لمطعم "${name}".
أجب بـ JSON فقط (بدون markdown) بالمفاتيح:
name, goal (INCREASE_SALES|INCREASE_RESERVATIONS|PROMOTE_OFFER|INCREASE_FOLLOWERS|PROMOTE_EVENT),
audience, totalBudgetSar, platforms (مصفوفة: platform, budgetPercent, budgetAmount, allocationReason, adCopies[3]),
videoIdea15s, headline, cta, scheduleStart (YYYY-MM-DD), scheduleEnd (YYYY-MM-DD), kpis (مصفوفة), summaryAr.

قواعد صارمة:
- لا تنشر إعلانات فعلياً — مسودة فقط.
- احترم طلب المستخدم بعدم النشر قبل موافقته.
- استخدم المنصات المطلوبة في رسالة المستخدم إن وُجدت.
- وزّع الميزانية مع سبب واضح لكل منصة.
- 3 نصوص إعلانية عربية لكل منصة.
- فكرة فيديو 15 ثانية.
- مؤشرات أداء واقعية (CTR, CPA, ROAS, حجوزات...).
- اليوم: ${new Date().toISOString().slice(0, 10)}.
- مبيعات الشهر: ${metrics.monthlySales.toFixed(0)} ر.س | حجوزات اليوم: ${metrics.reservations}.
- حسابات مربوطة: ${connected || "لا يوجد"}.
- حسابات غير مربوطة (لا تنشر عليها): ${disconnected.join("، ") || "—"}.`;

  const result = await callPlatformOpenAiText({
    role: "MARKETING_MANAGER",
    restaurantId,
    logTag: "marketing-assistant-campaign",
    instructions,
    userMessage,
    maxOutputTokens: 4096,
  });

  if (!result.ok) return { ok: false, error: result.message };
  if (!result.text.trim()) {
    return { ok: false, error: "لم يرجع OpenAI محتوى — حاول مرة أخرى." };
  }

  const proposal = parseProposal(result.text, budget);
  if (!proposal) {
    return {
      ok: false,
      error: "تعذّر تحليل رد OpenAI — حاول صياغة الطلب بشكل أوضح.",
    };
  }

  if (!proposal.summaryAr) {
    proposal.summaryAr = `حملة «${proposal.name}» بميزانية ${proposal.totalBudgetSar} ر.س — ${proposal.platforms.map((p) => p.labelAr).join(" + ")}`;
  }

  return { ok: true, proposal, modelId: result.modelId };
}

export async function answerMarketingAssistantQuestion(
  restaurantId: string,
  question: string
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const brain = await resolvePlatformOpenAiForRole("DATA_ANALYST");
  if (!brain.ok) return { ok: false, error: brain.message };

  const access = await assertRestaurantAiAccess({
    restaurantId,
    roleId: "DATA_ANALYST",
  });
  if (!access.ok) return { ok: false, error: access.message };

  const ctx = await buildMarketingContext(restaurantId);

  const result = await callPlatformOpenAiText({
    role: "DATA_ANALYST",
    restaurantId,
    logTag: "marketing-assistant-chat",
    instructions: `أنت محلل بيانات تسويق لمطعم "${ctx.name}". استخدم الأرقام التالية فقط — لا تختلق:
- مبيعات اليوم: ${ctx.metrics.todaySales.toFixed(0)} ر.س
- مبيعات الأسبوع: ${ctx.metrics.weeklySales.toFixed(0)} ر.س
- مبيعات الشهر: ${ctx.metrics.monthlySales.toFixed(0)} ر.س
- عملاء جدد: ${ctx.metrics.newCustomers}
- حجوزات اليوم: ${ctx.metrics.reservations}
- نقاط التسويق: ${ctx.metrics.aiMarketingScore}/100
- أطباق شائعة: ${ctx.topDishes}
أجب بالعربية بشكل عملي. لا تنشر إعلانات.`,
    userMessage: question,
    maxOutputTokens: 800,
  });

  if (!result.ok) return { ok: false, error: result.message };
  if (!result.text.trim()) {
    return { ok: false, error: "لم يرجع OpenAI رداً — حاول مرة أخرى." };
  }

  return { ok: true, text: result.text.trim() };
}

export async function saveCampaignDraftFromProposal(
  restaurantId: string,
  proposal: MarketingCampaignProposal,
  userId?: string
) {
  const primaryPlatform = proposal.platforms[0]?.platform as MarketingPlatform | undefined;
  const allCopy = proposal.platforms
    .flatMap((p) => p.adCopies.filter(Boolean))
    .join("\n---\n");

  return prisma.marketingCampaign.create({
    data: {
      restaurantId,
      name: proposal.name,
      goal: proposal.goal,
      status: "DRAFT",
      platform: primaryPlatform,
      budget: proposal.totalBudgetSar,
      scheduleStart: new Date(proposal.scheduleStart),
      scheduleEnd: new Date(proposal.scheduleEnd),
      headline: proposal.headline,
      primaryText: proposal.summaryAr,
      cta: proposal.cta,
      copyAr: allCopy || proposal.summaryAr,
      captions: proposal.videoIdea15s,
      audienceJson: {
        audience: proposal.audience,
        aiProposal: proposal,
        kpis: proposal.kpis,
      },
      createdByUserId: userId,
    },
  });
}

export async function approveCampaignDraft(
  restaurantId: string,
  campaignId: string,
  userId?: string
) {
  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, restaurantId, deletedAt: null },
  });
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة" };

  const platformCards = await getOwnerPlatformCards(restaurantId);
  const missing = REQUIRED_AD_PLATFORMS.filter(
    (k) => !platformCards.some((p) => p.key === k && p.status === "CONNECTED")
  );

  const updated = await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SCHEDULED",
      audienceJson: {
        ...(typeof campaign.audienceJson === "object" && campaign.audienceJson
          ? (campaign.audienceJson as Record<string, unknown>)
          : {}),
        approvedAt: new Date().toISOString(),
        approvedByUserId: userId,
        publishBlocked: true,
      },
    },
  });

  const note =
    missing.length > 0
      ? `جاهزة للنشر بعد ربط الحسابات الإعلانية: ${missing.map((k) => PLATFORM_LABELS[k] || k).join("، ")}`
      : "جاهزة للنشر بعد ربط الحسابات الإعلانية — لن يتم النشر تلقائياً.";

  return {
    ok: true as const,
    campaign: updated,
    message: note,
    missingPlatforms: missing,
    published: false as const,
  };
}

export async function rejectCampaignDraft(restaurantId: string, campaignId: string) {
  const existing = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, restaurantId, deletedAt: null },
  });
  if (!existing) return { ok: false as const, error: "الحملة غير موجودة" };

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "ARCHIVED", archivedAt: new Date(), deletedAt: new Date() },
  });

  return { ok: true as const };
}

export async function updateCampaignFromProposal(
  restaurantId: string,
  campaignId: string,
  proposal: MarketingCampaignProposal
) {
  const existing = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, restaurantId, deletedAt: null },
  });
  if (!existing) return { ok: false as const, error: "الحملة غير موجودة" };

  const allCopy = proposal.platforms
    .flatMap((p) => p.adCopies.filter(Boolean))
    .join("\n---\n");

  const updated = await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      name: proposal.name,
      goal: proposal.goal,
      budget: proposal.totalBudgetSar,
      scheduleStart: new Date(proposal.scheduleStart),
      scheduleEnd: new Date(proposal.scheduleEnd),
      headline: proposal.headline,
      cta: proposal.cta,
      copyAr: allCopy || proposal.summaryAr,
      captions: proposal.videoIdea15s,
      primaryText: proposal.summaryAr,
      audienceJson: {
        audience: proposal.audience,
        aiProposal: proposal,
        kpis: proposal.kpis,
      },
    },
  });

  return { ok: true as const, campaign: updated };
}
