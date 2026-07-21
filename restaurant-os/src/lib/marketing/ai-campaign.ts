import prisma from "@/lib/prisma";
import type { MarketingCampaignGoal } from "@prisma/client";
import { callPlatformOpenAiText } from "@/lib/openai/responses-client";
import { resolvePlatformOpenAiForRole } from "@/lib/platform/openai-brain";
import { assertRestaurantAiAccess } from "@/lib/restaurant-ai-access/service";

const GOAL_LABELS: Record<MarketingCampaignGoal, { ar: string; en: string }> = {
  INCREASE_SALES: { ar: "زيادة المبيعات", en: "Increase Sales" },
  INCREASE_RESERVATIONS: { ar: "زيادة الحجوزات", en: "Increase Reservations" },
  INCREASE_WHATSAPP: { ar: "زيادة التواصل عبر واتساب", en: "Increase WhatsApp Engagement" },
  PROMOTE_OFFER: { ar: "ترويج عرض خاص", en: "Promote Special Offer" },
  PROMOTE_NEW_MENU: { ar: "ترويج منيو جديد", en: "Promote New Menu" },
  PROMOTE_EVENT: { ar: "ترويج فعالية", en: "Promote Event" },
  INCREASE_FOLLOWERS: { ar: "زيادة المتابعين", en: "Increase Followers" },
};

export interface GeneratedCampaignCopy {
  headline: string;
  primaryText: string;
  cta: string;
  copyAr: string;
  copyEn: string;
  hashtags: string[];
  captions: string;
  draftOnly: true;
  published: false;
}

function templateCopy(
  restaurantName: string,
  goal: MarketingCampaignGoal,
  context?: string
): GeneratedCampaignCopy {
  const g = GOAL_LABELS[goal];
  return {
    headline: `${restaurantName} — ${g.ar}`,
    primaryText: context || `اكتشف تجربة فريدة في ${restaurantName}. ${g.ar} الآن!`,
    cta: goal === "INCREASE_RESERVATIONS" ? "احجز الآن" : goal === "INCREASE_WHATSAPP" ? "تواصل واتساب" : "اطلب الآن",
    copyAr: `🍽️ ${restaurantName}\n${g.ar}\n${context || "عرض حصري لفترة محدودة"}\n#${restaurantName.replace(/\s/g, "")}`,
    copyEn: `🍽️ ${restaurantName}\n${g.en}\n${context || "Limited time offer"}\n#restaurant`,
    hashtags: [restaurantName.replace(/\s/g, ""), "مطاعم", "foodie", "saudi", goal.toLowerCase()],
    captions: `${g.ar} — ${restaurantName}`,
    draftOnly: true,
    published: false,
  };
}

async function fetchOpenAiDraft(
  prompt: string,
  role: "MARKETING_MANAGER" | "AD_COPYWRITER",
  restaurantId: string
): Promise<string | null> {
  const result = await callPlatformOpenAiText({
    role,
    restaurantId,
    logTag: role === "MARKETING_MANAGER" ? "marketing-manager" : "ad-copywriter",
    instructions:
      "You are a restaurant marketing expert. Respond in JSON only with keys: headline, primaryText, cta, copyAr, copyEn, hashtags (array), captions. Draft only — never publish.",
    userMessage: prompt,
    maxOutputTokens: 512,
  });
  if (!result.ok) return null;
  return result.text || null;
}

function parseDraft(raw: string, fallback: GeneratedCampaignCopy): GeneratedCampaignCopy {
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, ""));
    return {
      headline: parsed.headline || fallback.headline,
      primaryText: parsed.primaryText || fallback.primaryText,
      cta: parsed.cta || fallback.cta,
      copyAr: parsed.copyAr || fallback.copyAr,
      copyEn: parsed.copyEn || fallback.copyEn,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : fallback.hashtags,
      captions: parsed.captions || fallback.captions,
      draftOnly: true,
      published: false,
    };
  } catch {
    return fallback;
  }
}

/** Marketing Manager — generates campaign draft only (never publishes). */
export async function generateCampaignCopy(opts: {
  restaurantId: string;
  goal: MarketingCampaignGoal;
  context?: string;
}): Promise<GeneratedCampaignCopy | { error: string }> {
  const brain = await resolvePlatformOpenAiForRole("MARKETING_MANAGER");
  if (!brain.ok) return { error: brain.message };

  const access = await assertRestaurantAiAccess({
    restaurantId: opts.restaurantId,
    roleId: "MARKETING_MANAGER",
  });
  if (!access.ok) return { error: access.message };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { name: true, nameAr: true, welcomeText: true },
  });
  const name = restaurant?.nameAr || restaurant?.name || "المطعم";
  const fallback = templateCopy(name, opts.goal, opts.context);

  const prompt = `Generate marketing copy draft for restaurant "${name}" with goal: ${opts.goal}. Context: ${opts.context || "general promotion"}. Include Arabic and English. Draft only.`;

  const aiRaw = await fetchOpenAiDraft(prompt, "MARKETING_MANAGER", opts.restaurantId);
  if (!aiRaw) return fallback;

  return parseDraft(aiRaw, fallback);
}

/** Ad Copywriter — short-form ad copy draft only. */
export async function generateAdCopyDraft(opts: {
  restaurantId: string;
  format: string;
  brief?: string;
}): Promise<{ copyAr: string; copyEn: string; cta: string; draftOnly: true; published: false } | { error: string }> {
  const brain = await resolvePlatformOpenAiForRole("AD_COPYWRITER");
  if (!brain.ok) return { error: brain.message };

  const access = await assertRestaurantAiAccess({
    restaurantId: opts.restaurantId,
    roleId: "AD_COPYWRITER",
  });
  if (!access.ok) return { error: access.message };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { name: true, nameAr: true },
  });
  const name = restaurant?.nameAr || restaurant?.name || "المطعم";
  const prompt = `Write ${opts.format} ad copy draft for "${name}". Brief: ${opts.brief || "promotional"}. JSON keys: copyAr, copyEn, cta. Draft only.`;

  const aiRaw = await fetchOpenAiDraft(prompt, "AD_COPYWRITER", opts.restaurantId);
  if (!aiRaw) {
    return {
      copyAr: `🍽️ ${name} — عرض خاص اليوم`,
      copyEn: `${name} — special offer today`,
      cta: "اطلب الآن",
      draftOnly: true,
      published: false,
    };
  }

  try {
    const parsed = JSON.parse(aiRaw.replace(/```json\n?|\n?```/g, ""));
    return {
      copyAr: String(parsed.copyAr || `🍽️ ${name}`),
      copyEn: String(parsed.copyEn || name),
      cta: String(parsed.cta || "اطلب الآن"),
      draftOnly: true,
      published: false,
    };
  } catch {
    return {
      copyAr: `🍽️ ${name} — مسودة إعلان`,
      copyEn: `${name} — ad draft`,
      cta: "اطلب الآن",
      draftOnly: true,
      published: false,
    };
  }
}
