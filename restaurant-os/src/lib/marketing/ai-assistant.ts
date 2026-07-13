import prisma from "@/lib/prisma";
import { getMarketingDashboardMetrics } from "@/lib/marketing/dashboard-metrics";
import { OrderStatus } from "@prisma/client";

export async function answerMarketingQuestion(
  restaurantId: string,
  question: string
): Promise<string> {
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
  const q = question.toLowerCase();

  if (q.includes("sales down") || q.includes("مبيعات") && q.includes("انخفاض")) {
    const diff = metrics.weeklySales - metrics.todaySales * 7;
    return diff < 0
      ? `مبيعات ${name} هذا الأسبوع (${metrics.weeklySales.toFixed(0)} ر.س) أقل من المتوقع. أنصح بترويج ${topItems[0]?.name || "الأطباق الأكثر مبيعاً"} عبر إنستغرام وواتساب.`
      : `مبيعات ${name} مستقرة. مبيعات اليوم: ${metrics.todaySales.toFixed(0)} ر.س، الأسبوع: ${metrics.weeklySales.toFixed(0)} ر.س.`;
  }

  if (q.includes("advertise today") || q.includes("أعلن") || q.includes("اليوم")) {
    return `اليوم أنصح ${name} بالتركيز على: ${metrics.reservations > 0 ? "ترويج الحجوزات" : "زيادة الطلبات"}. أفضل منتج: ${topItems[0]?.name || "—"}.`;
  }

  if (q.includes("eid") || q.includes("عيد")) {
    return `حملة عيد لـ ${name}: عنوان "عيدكم مبارك — احتفلوا معنا"، CTA "احجز طاولتك"، عرض عائلي 20%، منشور ستory + ريل 30 ثانية.`;
  }

  if (q.includes("reel") || q.includes("instagram") || q.includes("ريل")) {
    return `ريل إنستغرام لـ ${name}: 30 ثانية، لقطات ${topItems.slice(0, 3).map((i) => i.name).join("، ") || "الأطباق المميزة"}، موسيقى خفيفة، CTA "اطلب الآن".`;
  }

  if (q.includes("weekend") || q.includes("نهاية الأسبوع") || q.includes("عرض")) {
    return `عرض نهاية الأسبوع: "خصم 15% على ${topItems[0]?.name || "المنيو"} — الجمعة والسبت فقط".`;
  }

  if (q.includes("dish") || q.includes("promote") || q.includes("طبق") || q.includes("روّج")) {
    const dish = topItems[0]?.name || "طبق اليوم";
    return `أفضل طبق للترويج الآن: **${dish}** (${topItems[0]?._sum.quantity || 0} طلب الشهر الماضي).`;
  }

  return `📊 ${name}: مبيعات الشهر ${metrics.monthlySales.toFixed(0)} ر.س | ${metrics.newCustomers} عميل جديد | ${metrics.reservations} حجز اليوم | نقاط التسويق ${metrics.aiMarketingScore}/100. اسألني عن حملات، عروض، أو محتوى.`;
}
