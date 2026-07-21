import prisma from "@/lib/prisma";
import { getMarketingDashboardMetrics } from "@/lib/marketing/dashboard-metrics";
import { OrderStatus } from "@prisma/client";
import { callPlatformOpenAiText } from "@/lib/openai/responses-client";
import { resolvePlatformOpenAiForRole } from "@/lib/platform/openai-brain";
import { assertRestaurantAiAccess } from "@/lib/restaurant-ai-access/service";

export async function buildMarketingContext(restaurantId: string) {
  const [metrics, restaurant, topItems] = await Promise.all([
    getMarketingDashboardMetrics(restaurantId),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, nameAr: true },
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      where: {
        order: {
          branch: { restaurantId },
          status: OrderStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const name = restaurant?.nameAr || restaurant?.name || "المطعم";
  return {
    name,
    metrics,
    topDishes: topItems.map((i) => `${i.name} (${i._sum.quantity ?? 0})`).join("، ") || "—",
  };
}

function ruleBasedAnswer(
  name: string,
  metrics: Awaited<ReturnType<typeof getMarketingDashboardMetrics>>,
  topItems: { name: string; _sum: { quantity: number | null } }[],
  question: string
): string {
  const q = question.toLowerCase();

  if (q.includes("sales down") || (q.includes("مبيعات") && q.includes("انخفاض"))) {
    const diff = metrics.weeklySales - metrics.todaySales * 7;
    return diff < 0
      ? `مبيعات ${name} هذا الأسبوع (${metrics.weeklySales.toFixed(0)} ر.س) أقل من المتوقع. أنصح بترويج ${topItems[0]?.name || "الأطباق الأكثر مبيعاً"} عبر إنستغرام وواتساب.`
      : `مبيعات ${name} مستقرة. مبيعات اليوم: ${metrics.todaySales.toFixed(0)} ر.س، الأسبوع: ${metrics.weeklySales.toFixed(0)} ر.س.`;
  }

  if (q.includes("dish") || q.includes("promote") || q.includes("طبق") || q.includes("روّج")) {
    const dish = topItems[0]?.name || "طبق اليوم";
    return `أفضل طبق للترويج الآن: **${dish}** (${topItems[0]?._sum.quantity || 0} طلب الشهر الماضي).`;
  }

  return `📊 ${name}: مبيعات الشهر ${metrics.monthlySales.toFixed(0)} ر.س | ${metrics.newCustomers} عميل جديد | ${metrics.reservations} حجز اليوم | نقاط التسويق ${metrics.aiMarketingScore}/100. اسألني عن حملات، عروض، أو محتوى.`;
}

/** Data Analyst — uses central OpenAI from AI Brain when enabled. */
export async function answerMarketingQuestion(
  restaurantId: string,
  question: string
): Promise<string> {
  const ctx = await buildMarketingContext(restaurantId);
  const brain = await resolvePlatformOpenAiForRole("DATA_ANALYST");
  const access = await assertRestaurantAiAccess({
    restaurantId,
    roleId: "DATA_ANALYST",
  });

  if (!brain.ok) {
    return `${brain.message}\n\n${ruleBasedAnswer(ctx.name, ctx.metrics, [], question)}`;
  }
  if (!access.ok) {
    return `${access.message}\n\n${ruleBasedAnswer(ctx.name, ctx.metrics, [], question)}`;
  }

  const result = await callPlatformOpenAiText({
    role: "DATA_ANALYST",
    restaurantId,
    logTag: "data-analyst",
    instructions: `أنت محلل بيانات تسويق لمطعم "${ctx.name}". استخدم الأرقام التالية فقط — لا تختلق بيانات:
- مبيعات اليوم: ${ctx.metrics.todaySales.toFixed(0)} ر.س
- مبيعات الأسبوع: ${ctx.metrics.weeklySales.toFixed(0)} ر.س
- مبيعات الشهر: ${ctx.metrics.monthlySales.toFixed(0)} ر.س
- عملاء جدد: ${ctx.metrics.newCustomers}
- حجوزات اليوم: ${ctx.metrics.reservations}
- نقاط التسويق: ${ctx.metrics.aiMarketingScore}/100
- أطباق شائعة: ${ctx.topDishes}
أجب بالعربية بشكل مختصر وعملي. لا تنشر إعلانات ولا تنفّذ أوامر.`,
    userMessage: question,
    maxOutputTokens: 400,
  });

  if (result.ok && result.text.trim()) {
    return result.text.trim();
  }

  const topItems = await prisma.orderItem.groupBy({
    by: ["name"],
    where: {
      order: {
        branch: { restaurantId },
        status: OrderStatus.COMPLETED,
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return ruleBasedAnswer(ctx.name, ctx.metrics, topItems, question);
}
