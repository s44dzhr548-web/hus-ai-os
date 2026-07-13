import type { EnterpriseTableStats } from "@/lib/table-enterprise-stats";
import { Card } from "@/components/ui";

export function TableStatsBar({ stats }: { stats: EnterpriseTableStats }) {
  const items = [
    { label: "الإجمالي", value: stats.total, color: "text-gray-900", bg: "bg-white" },
    { label: "نشطة", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "معطلة", value: stats.disabled, color: "text-gray-700", bg: "bg-gray-100" },
    { label: "مؤرشف", value: stats.archived, color: "text-slate-600", bg: "bg-slate-50" },
    { label: "مشغولة", value: stats.occupied, color: "text-red-600", bg: "bg-red-50" },
    { label: "متاحة", value: stats.free, color: "text-emerald-700", bg: "bg-green-50" },
    { label: "محجوزة", value: stats.reserved, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "QR جاهز", value: stats.qrGenerated, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" data-testid="table-stats-bar">
      {items.map((item) => (
        <Card key={item.label} className={`p-2 text-center sm:p-3 ${item.bg}`}>
          <p className={`text-lg font-bold sm:text-xl ${item.color}`}>{item.value}</p>
          <p className="text-[10px] text-gray-500 sm:text-xs">{item.label}</p>
        </Card>
      ))}
    </div>
  );
}
