"use client";

import { Button, Modal } from "@/components/ui";
import { areaLabel } from "@/lib/table-areas";
import { Archive, Pencil, QrCode } from "lucide-react";
import type { QrData, TableRow } from "./table-types";

interface PreviewData {
  number: number;
  label?: string | null;
  floorZone?: string | null;
  qrCode?: string | null;
  capacity: number;
  operationalStatus?: string;
  _count?: { orders: number; reservations: number; tableSessions: number };
  orders?: Array<{
    orderNumber: number;
    status: string;
    totalAmount: unknown;
    customerName?: string | null;
    createdAt: string;
  }>;
  reservations?: Array<{
    customerName: string;
    date: string;
    status: string;
    guestCount: number;
  }>;
  lastVisit?: { createdAt: string; customerName: string; totalBill: unknown } | null;
}

interface TablePreviewPanelProps {
  table: TableRow | null;
  detail: PreviewData | null;
  qr: QrData | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRegenerateQr: () => void;
}

export function TablePreviewPanel({
  table,
  detail,
  qr,
  canManage,
  onClose,
  onEdit,
  onArchive,
  onRegenerateQr,
}: TablePreviewPanelProps) {
  return (
    <Modal open={!!table} onClose={onClose} title={table ? `طاولة ${table.number}` : ""}>
      {table && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-500">الرقم</p>
              <p className="font-bold">{table.number}</p>
            </div>
            <div>
              <p className="text-gray-500">المنطقة</p>
              <p>{areaLabel(table.floorZone)}</p>
            </div>
            <div>
              <p className="text-gray-500">الاسم</p>
              <p>{table.label || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">السعة</p>
              <p>{table.capacity}</p>
            </div>
          </div>

          {qr && (
            <div className="text-center">
              <img src={qr.qrDataUrl} alt="QR" className="mx-auto h-40 w-40 rounded-lg border p-1" />
              <p className="mt-1 break-all text-[10px] text-gray-400" dir="ltr">
                {qr.menuUrl}
              </p>
            </div>
          )}

          {detail && (
            <>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium">الإحصائيات</p>
                <p className="text-xs text-gray-600">
                  {detail._count?.orders ?? 0} طلب · {detail._count?.reservations ?? 0} حجز ·{" "}
                  {detail._count?.tableSessions ?? 0} جلسة
                </p>
              </div>

              {detail.lastVisit && (
                <div className="rounded-lg border p-3">
                  <p className="font-medium">آخر زيارة</p>
                  <p className="text-xs">{detail.lastVisit.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(detail.lastVisit.createdAt).toLocaleString("ar-SA")}
                  </p>
                </div>
              )}

              {detail.orders && detail.orders.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">آخر الطلبات</p>
                  {detail.orders.slice(0, 3).map((o) => (
                    <p key={o.orderNumber} className="text-xs text-gray-600">
                      #{o.orderNumber} — {o.status}
                    </p>
                  ))}
                </div>
              )}

              {detail.reservations && detail.reservations.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">الحجوزات القادمة</p>
                  {detail.reservations.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-xs text-gray-600">
                      {r.customerName} — {new Date(r.date).toLocaleDateString("ar-SA")}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
              <Button size="sm" variant="outline" onClick={onRegenerateQr}>
                <QrCode className="h-3.5 w-3.5" />
                تجديد QR
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={onArchive}>
                <Archive className="h-3.5 w-3.5" />
                أرشفة
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
