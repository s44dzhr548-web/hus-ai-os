"use client";

import { Badge } from "@/components/ui";
import { areaLabel } from "@/lib/table-areas";
import { statusLabelAr, statusStyles, tableVisualStatus } from "@/lib/table-status";
import { GripVertical, QrCode } from "lucide-react";
import type { TableRow } from "./table-types";

interface TableEnterpriseGridProps {
  tables: TableRow[];
  selected: Set<string>;
  bulkMode: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onOpen: (table: TableRow) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
  dragId: string | null;
}

export function TableEnterpriseGrid({
  tables,
  selected,
  bulkMode,
  canManage,
  onSelect,
  onSelectAll,
  onOpen,
  onDragStart,
  onDrop,
  dragId,
}: TableEnterpriseGridProps) {
  const allSelected = tables.length > 0 && tables.every((t) => selected.has(t.id));

  return (
    <div
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid="table-enterprise-grid"
    >
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-right text-xs text-slate-600">
            {bulkMode && canManage && (
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="تحديد الكل"
                />
              </th>
            )}
            {canManage && !bulkMode && <th className="w-8 px-1 py-3" />}
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">الاسم</th>
            <th className="px-3 py-3 font-medium">المنطقة</th>
            <th className="px-3 py-3 font-medium">السعة</th>
            <th className="px-3 py-3 font-medium">الحالة</th>
            <th className="px-3 py-3 font-medium">QR</th>
            <th className="px-3 py-3 font-medium">الطلبات</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((table) => {
            const visual = tableVisualStatus(table);
            const styles = statusStyles(visual);
            return (
              <tr
                key={table.id}
                draggable={canManage && !table.isArchived && !bulkMode}
                onDragStart={() => onDragStart(table.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(table.id)}
                onClick={() => {
                  if (bulkMode && canManage) onSelect(table.id);
                  else onOpen(table);
                }}
                className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${
                  selected.has(table.id) ? "bg-emerald-50/80" : ""
                } ${dragId === table.id ? "opacity-40" : ""} ${table.isArchived ? "opacity-60" : ""}`}
              >
                {bulkMode && canManage && (
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(table.id)}
                      onChange={() => onSelect(table.id)}
                    />
                  </td>
                )}
                {canManage && !bulkMode && (
                  <td className="px-1 py-2.5 text-slate-300">
                    <GripVertical className="h-4 w-4" />
                  </td>
                )}
                <td className="px-3 py-2.5 font-bold">{table.number}</td>
                <td className="px-3 py-2.5 text-slate-600">{table.label || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {areaLabel(table.floorZone)}
                </td>
                <td className="px-3 py-2.5">{table.capacity}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                    <span className="text-xs">{statusLabelAr(visual)}</span>
                    {table.isArchived && (
                      <Badge variant="default" className="text-[10px]">
                        مؤرشف
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {table.qrCode ? (
                    <QrCode className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <span className="text-xs text-orange-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400">
                  {table._count?.orders ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
