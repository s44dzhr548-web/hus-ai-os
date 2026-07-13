"use client";

import { Button } from "@/components/ui";
import {
  Archive,
  ArchiveRestore,
  Download,
  MoveRight,
  Power,
  PowerOff,
  Printer,
  Trash2,
} from "lucide-react";

interface TableBulkToolbarProps {
  count: number;
  showArchived: boolean;
  saving: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onMove: () => void;
  onPrintQr: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function TableBulkToolbar({
  count,
  showArchived,
  saving,
  onEnable,
  onDisable,
  onArchive,
  onDelete,
  onRestore,
  onMove,
  onPrintQr,
  onExport,
  onClear,
}: TableBulkToolbarProps) {
  if (count === 0) return null;

  return (
    <div
      className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3 shadow-sm"
      data-testid="table-bulk-toolbar"
    >
      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-sm font-semibold text-white">
        {count} محدد
      </span>
      <Button size="sm" variant="outline" loading={saving} onClick={onEnable}>
        <Power className="h-3.5 w-3.5" />
        تفعيل
      </Button>
      <Button size="sm" variant="outline" loading={saving} onClick={onDisable}>
        <PowerOff className="h-3.5 w-3.5" />
        تعطيل
      </Button>
      <Button size="sm" variant="outline" loading={saving} onClick={onMove}>
        <MoveRight className="h-3.5 w-3.5" />
        نقل
      </Button>
      {!showArchived ? (
        <>
          <Button size="sm" variant="outline" loading={saving} onClick={onArchive}>
            <Archive className="h-3.5 w-3.5" />
            أرشفة
          </Button>
          <Button size="sm" variant="outline" loading={saving} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" loading={saving} onClick={onRestore}>
          <ArchiveRestore className="h-3.5 w-3.5" />
          استعادة
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onPrintQr}>
        <Printer className="h-3.5 w-3.5" />
        طباعة QR
      </Button>
      <Button size="sm" variant="outline" onClick={onExport}>
        <Download className="h-3.5 w-3.5" />
        تصدير
      </Button>
      <button
        type="button"
        onClick={onClear}
        className="mr-auto text-xs text-slate-500 underline hover:text-slate-800"
      >
        إلغاء التحديد
      </button>
    </div>
  );
}
