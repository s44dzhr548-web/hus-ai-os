"use client";

import Link from "next/link";
import {
  Button,
  Card,
  Badge,
} from "@/components/ui";
import {
  TABLE_SESSION_STATUS_LABELS,
  TABLE_OPERATIONAL_COLORS,
  TABLE_OPERATIONAL_LABELS,
} from "@/lib/reception";
import {
  ExternalLink,
  ClipboardList,
  MessageSquare,
  XCircle,
  Users,
  Phone,
  Banknote,
  Clock,
  ArrowRightLeft,
  GitMerge,
  Split,
  Printer,
  Crown,
} from "lucide-react";

export interface ReceptionTableCard {
  table: {
    id: string;
    number: number;
    label?: string;
    capacity: number;
    branchId: string;
    branchName: string;
    menuUrl: string;
    operationalStatus: string;
    operationalLabel: string;
    floorMapX?: number | null;
    floorMapY?: number | null;
    floorZone?: string | null;
  };
  session: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    guestCount: number;
    minimumSpendAmount?: number | null;
    status: string;
    notes?: string | null;
    startedAt: string;
    durationMinutes?: number;
    currentBill?: number;
    occasion?: string | null;
  } | null;
  status: string;
}

interface Props {
  card: ReceptionTableCard;
  onStatusChange: (sessionId: string, status: string) => void;
  onNote: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onMove: (sessionId: string) => void;
  onMerge: (sessionId: string) => void;
  onSplit: (sessionId: string) => void;
  onPrintBill: (sessionId: string) => void;
  onAssign: (tableId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-amber-100 text-amber-800",
  OCCUPIED: "bg-red-100 text-red-800",
  CLEANING: "bg-blue-100 text-blue-800",
  OUT_OF_SERVICE: "bg-gray-200 text-gray-600",
  WAITING: "bg-amber-100 text-amber-800",
  SEATED: "bg-blue-100 text-blue-800",
  ORDERING: "bg-purple-100 text-purple-800",
  FOOD_PREPARING: "bg-orange-100 text-orange-800",
  SERVING: "bg-indigo-100 text-indigo-800",
  PAID: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-gray-200 text-gray-600",
};

export function ReceptionTableCardView({
  card,
  onStatusChange,
  onNote,
  onClose,
  onMove,
  onMerge,
  onSplit,
  onPrintBill,
  onAssign,
}: Props) {
  const { table, session, status } = card;
  const opColor = TABLE_OPERATIONAL_COLORS[table.operationalStatus as keyof typeof TABLE_OPERATIONAL_COLORS];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${opColor || "bg-gray-400"}`} />
            <h3 className="text-lg font-bold">طاولة {table.number}</h3>
          </div>
          <p className="text-xs text-gray-500">
            {table.branchName} · {table.operationalLabel || TABLE_OPERATIONAL_LABELS[table.operationalStatus as keyof typeof TABLE_OPERATIONAL_LABELS]}
            {table.floorZone ? ` · ${table.floorZone}` : ""}
          </p>
        </div>
        <Badge className={STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE}>
          {TABLE_SESSION_STATUS_LABELS[status] || status}
        </Badge>
      </div>

      {session ? (
        <>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-1 font-semibold">
              {session.customerName}
              <Crown className="h-3.5 w-3.5 text-amber-500" />
            </p>
            {session.customerPhone && (
              <p className="flex items-center gap-1 text-gray-600">
                <Phone className="h-3.5 w-3.5" /> {session.customerPhone}
              </p>
            )}
            <p className="flex items-center gap-1 text-gray-600">
              <Users className="h-3.5 w-3.5" /> {session.guestCount} ضيوف
            </p>
            <p className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {new Date(session.startedAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              {session.durationMinutes != null && ` · ${session.durationMinutes} د`}
            </p>
            {session.currentBill != null && session.currentBill > 0 && (
              <p className="font-medium text-emerald-700">
                الفاتورة: {session.currentBill.toFixed(2)} ر.س
              </p>
            )}
            {session.minimumSpendAmount != null && session.minimumSpendAmount > 0 && (
              <p className="flex items-center gap-1 font-medium text-amber-700">
                <Banknote className="h-3.5 w-3.5" />
                حد أدنى: {session.minimumSpendAmount} ريال
              </p>
            )}
            {session.occasion && (
              <p className="text-xs text-gray-500">المناسبة: {session.occasion}</p>
            )}
            {session.notes && <p className="text-xs text-gray-500">{session.notes}</p>}
          </div>

          <select
            value={session.status}
            onChange={(e) => onStatusChange(session.id, e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            {["WAITING", "SEATED", "ORDERING", "FOOD_PREPARING", "SERVING", "PAID", "COMPLETED"].map((s) => (
              <option key={s} value={s}>{TABLE_SESSION_STATUS_LABELS[s] || s}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <Link href={table.menuUrl} target="_blank">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3.5 w-3.5" /> المنيو
              </Button>
            </Link>
            <Link href={`/dashboard/orders?tableId=${table.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                <ClipboardList className="h-3.5 w-3.5" /> الطلبات
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => onNote(session.id)}>
              <MessageSquare className="h-3.5 w-3.5" /> ملاحظة
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPrintBill(session.id)}>
              <Printer className="h-3.5 w-3.5" /> طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMove(session.id)}>
              <ArrowRightLeft className="h-3.5 w-3.5" /> نقل
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMerge(session.id)}>
              <GitMerge className="h-3.5 w-3.5" /> دمج
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSplit(session.id)}>
              <Split className="h-3.5 w-3.5" /> تقسيم
            </Button>
            <Button variant="danger" size="sm" onClick={() => onClose(session.id)}>
              <XCircle className="h-3.5 w-3.5" /> إغلاق
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-3">
          <p className="text-sm text-gray-500">سعة {table.capacity} · متاحة</p>
          <Button size="sm" onClick={() => onAssign(table.id)}>تسجيل عميل</Button>
        </div>
      )}
    </Card>
  );
}

export function FloorMapView({ cards }: { cards: ReceptionTableCard[] }) {
  return (
    <div className="relative min-h-[420px] overflow-auto rounded-xl border bg-stone-50 p-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}>
        {cards.map(({ table, session, status }) => {
          const color = session
            ? "bg-red-500 text-white"
            : table.operationalStatus === "RESERVED"
              ? "bg-amber-400 text-white"
              : table.operationalStatus === "CLEANING"
                ? "bg-blue-500 text-white"
                : table.operationalStatus === "OUT_OF_SERVICE"
                  ? "bg-gray-400 text-white"
                  : "bg-emerald-500 text-white";
          return (
            <div
              key={table.id}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl shadow ${color}`}
              title={session?.customerName || table.operationalLabel}
            >
              <span className="text-lg font-bold">{table.number}</span>
              <span className="text-[10px] opacity-90">
                {session ? session.guestCount : table.capacity}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> متاح</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> محجوز</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> مشغول</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-500" /> تنظيف</span>
      </div>
    </div>
  );
}
