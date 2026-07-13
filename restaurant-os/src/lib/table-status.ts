import type { TableRow } from "@/components/tables/table-types";

export type TableVisualStatus = "available" | "occupied" | "reserved" | "disabled";

export function tableVisualStatus(table: TableRow): TableVisualStatus {
  if (table.isArchived || !table.isActive) return "disabled";
  switch (table.operationalStatus) {
    case "OCCUPIED":
      return "occupied";
    case "RESERVED":
      return "reserved";
    default:
      return "available";
  }
}

export const STATUS_LEGEND = [
  { key: "available" as const, emoji: "🟢", labelAr: "متاحة", color: "#22c55e" },
  { key: "occupied" as const, emoji: "🔴", labelAr: "مشغولة", color: "#ef4444" },
  { key: "reserved" as const, emoji: "🟡", labelAr: "محجوزة", color: "#eab308" },
  { key: "disabled" as const, emoji: "⚫", labelAr: "معطلة", color: "#374151" },
];

export function statusStyles(status: TableVisualStatus) {
  switch (status) {
    case "occupied":
      return {
        bg: "bg-red-100",
        border: "border-red-500",
        text: "text-red-900",
        dot: "bg-red-500",
        ring: "ring-red-400",
      };
    case "reserved":
      return {
        bg: "bg-amber-100",
        border: "border-amber-500",
        text: "text-amber-900",
        dot: "bg-amber-500",
        ring: "ring-amber-400",
      };
    case "disabled":
      return {
        bg: "bg-gray-700",
        border: "border-gray-500",
        text: "text-gray-100",
        dot: "bg-gray-800",
        ring: "ring-gray-500",
      };
    default:
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-500",
        text: "text-emerald-900",
        dot: "bg-emerald-500",
        ring: "ring-emerald-400",
      };
  }
}

export function statusLabelAr(status: TableVisualStatus) {
  return STATUS_LEGEND.find((s) => s.key === status)?.labelAr ?? "—";
}
