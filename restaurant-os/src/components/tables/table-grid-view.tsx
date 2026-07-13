"use client";

import { Badge, Card } from "@/components/ui";
import { areaLabel } from "@/lib/table-areas";
import { GripVertical, QrCode } from "lucide-react";
import type { TableRow } from "./table-types";

interface TableGridViewProps {
  tables: TableRow[];
  selected: Set<string>;
  bulkMode: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onOpen: (table: TableRow) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
  dragId: string | null;
}

function statusColor(status?: string) {
  switch (status) {
    case "OCCUPIED":
      return "danger";
    case "RESERVED":
      return "warning";
    case "AVAILABLE":
      return "success";
    default:
      return "default";
  }
}

export function TableGridView({
  tables,
  selected,
  bulkMode,
  canManage,
  onSelect,
  onOpen,
  onDragStart,
  onDrop,
  dragId,
}: TableGridViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {tables.map((table) => (
        <Card
          key={table.id}
          draggable={canManage && !table.isArchived && !bulkMode}
          onDragStart={() => onDragStart(table.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(table.id)}
          onClick={() => {
            if (bulkMode && canManage) onSelect(table.id);
            else onOpen(table);
          }}
          className={`cursor-pointer p-3 transition hover:shadow-md ${
            selected.has(table.id) ? "ring-2 ring-emerald-500" : ""
          } ${dragId === table.id ? "opacity-40" : ""} ${table.isArchived ? "opacity-60" : ""}`}
        >
          <div className="flex items-start justify-between gap-1">
            {bulkMode && canManage && (
              <input
                type="checkbox"
                checked={selected.has(table.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(table.id);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {canManage && !bulkMode && (
              <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
            )}
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xl font-bold">#{table.number}</p>
              <p className="truncate text-xs text-gray-500">{table.label || "—"}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant={table.isActive ? "success" : "danger"}>
              {table.isArchived ? "مؤرشف" : table.isActive ? "نشط" : "معطل"}
            </Badge>
            <Badge variant={statusColor(table.operationalStatus)}>
              {table.operationalStatus === "OCCUPIED"
                ? "مشغول"
                : table.operationalStatus === "RESERVED"
                  ? "محجوز"
                  : "متاح"}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">{areaLabel(table.floorZone)}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
            <span>{table.capacity} مقاعد</span>
            {table.qrCode ? (
              <QrCode className="h-3 w-3 text-emerald-500" />
            ) : (
              <span className="text-orange-500">No QR</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
