import prisma from "@/lib/prisma";
import type { MarketingCampaignGoal } from "@prisma/client";

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
}

async function fetchOpenAi(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a restaurant marketing expert. Respond in JSON only with keys: headline, primaryText, cta, copyAr, copyEn, hashtags (array), captions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
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
  };
}

export async function generateCampaignCopy(opts: {
  restaurantId: string;
  goal: MarketingCampaignGoal;
  context?: string;
}): Promise<GeneratedCampaignCopy> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { name: true, nameAr: true, welcomeText: true },
  });
  const name = restaurant?.nameAr || restaurant?.name || "المطعم";

  const prompt = `Generate marketing copy for restaurant "${name}" with goal: ${opts.goal}. Context: ${opts.context || "general promotion"}. Include Arabic and English.`;

  const aiRaw = await fetchOpenAi(prompt);
  if (aiRaw) {
    try {
      const parsed = JSON.parse(aiRaw.replace(/```json\n?|\n?```/g, ""));
      return {
        headline: parsed.headline || templateCopy(name, opts.goal).headline,
        primaryText: parsed.primaryText || templateCopy(name, opts.goal).primaryText,
        cta: parsed.cta || templateCopy(name, opts.goal).cta,
        copyAr: parsed.copyAr || templateCopy(name, opts.goal).copyAr,
        copyEn: parsed.copyEn || templateCopy(name, opts.goal).copyEn,
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : templateCopy(name, opts.goal).hashtags,
        captions: parsed.captions || templateCopy(name, opts.goal).captions,
      };
    } catch {
      /* fall through */
    }
  }

  return templateCopy(name, opts.goal, opts.context);
}
