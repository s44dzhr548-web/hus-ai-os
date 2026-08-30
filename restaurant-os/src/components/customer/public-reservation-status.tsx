"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import type { PublicReservationView } from "@/lib/reservation-public";

const POLL_MS = 5000;

export function PublicReservationStatus({ token }: { token: string }) {
  const [reservation, setReservation] = useState<PublicReservationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editGuests, setEditGuests] = useState(2);
  const [editNotes, setEditNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/reservations/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "الحجز غير موجود");
        setReservation(null);
        return;
      }
      setError("");
      setReservation(data.reservation);
    } catch {
      setError("تعذر تحميل حالة الحجز");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    if (!reservation) return;
    setEditDate(reservation.date);
    setEditTime(reservation.time);
    setEditGuests(reservation.guestCount);
    setEditNotes(reservation.notes || reservation.occasion || "");
  }, [reservation]);

  async function saveEdit() {
    if (!reservation?.canEdit) return;
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/public/reservations/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          date: editDate,
          time: editTime,
          guestCount: editGuests,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "تعذر التعديل");
        return;
      }
      setReservation(data.reservation);
      setEditMode(false);
      setMessage("تم تحديث الحجز");
    } catch {
      setMessage("تعذر الاتصال");
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelReservation() {
    if (!reservation?.canCancel) return;
    if (!confirm("هل تريد إلغاء الحجز؟")) return;
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/public/reservations/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "تعذر الإلغاء");
        return;
      }
      setReservation(data.reservation);
      setEditMode(false);
    } catch {
      setMessage("تعذر الاتصال");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center opacity-70">جاري تحميل حالة الحجز...</div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-red-300">{error || "الحجز غير موجود"}</p>
        <Link href="/" className="mt-4 inline-block text-sm underline opacity-70">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const isPending = reservation.phase === "PENDING";
  const isCancelled = reservation.phase === "CANCELLED";

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        {!isCancelled ? (
          <>
            <p className="text-3xl">✅</p>
            <h2 className="mt-2 text-xl font-bold">تم استلام طلب الحجز</h2>
          </>
        ) : (
          <>
            <p className="text-3xl">❌</p>
            <h2 className="mt-2 text-xl font-bold">تم إلغاء الحجز</h2>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        {reservation.reservationNumber && (
          <Row label="رقم الحجز" value={`#${reservation.reservationNumber}`} highlight />
        )}
        <Row label="الحالة" value={reservation.phaseLabel} highlight />
        <Row label="الاسم" value={reservation.customerName} />
        <Row label="الجوال" value={reservation.customerPhone} dir="ltr" />
        <Row label="التاريخ" value={reservation.dateDisplay} />
        <Row label="الوقت" value={reservation.time} />
        <Row label="عدد الضيوف" value={String(reservation.guestCount)} />
        {reservation.sessionTypeLabel && (
          <Row label="نوع الجلسة" value={reservation.sessionTypeLabel} />
        )}
        {(reservation.notes || reservation.occasion) && (
          <Row label="الملاحظات" value={reservation.notes || reservation.occasion || ""} />
        )}
        {reservation.tableNumber != null && (
          <Row label="الطاولة" value={`طاولة رقم ${reservation.tableNumber}`} highlight />
        )}
        {reservation.minimumSpendAmount != null && reservation.minimumSpendAmount > 0 && (
          <Row
            label="الحد الأدنى"
            value={`${reservation.minimumSpendAmount} ر.س`}
          />
        )}
      </div>

      {!reservation.canEdit && !isCancelled && reservation.phase !== "PENDING" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          تم تأكيد الحجز، للتعديل يرجى التواصل مع المطعم.
        </p>
      )}

      {message && (
        <p className="rounded-lg bg-white/10 px-3 py-2 text-sm">{message}</p>
      )}

      {isPending && !editMode && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            onClick={() => setEditMode(true)}
            disabled={actionLoading}
          >
            تعديل الحجز
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-400/50 text-red-300"
            onClick={() => void cancelReservation()}
            loading={actionLoading}
          >
            إلغاء الحجز
          </Button>
        </div>
      )}

      {isPending && editMode && (
        <div className="space-y-4 rounded-2xl border border-white/10 p-4">
          <h3 className="font-semibold">تعديل الحجز</h3>
          <Input
            label="التاريخ"
            type="date"
            value={editDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <Input
            label="الوقت"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            placeholder="HH:MM"
            dir="ltr"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm">عدد الضيوف</span>
            <button
              type="button"
              className="h-10 w-10 rounded-lg border border-white/15"
              onClick={() => setEditGuests((g) => Math.max(1, g - 1))}
            >
              −
            </button>
            <span className="text-lg font-bold">{editGuests}</span>
            <button
              type="button"
              className="h-10 w-10 rounded-lg border border-white/15"
              onClick={() => setEditGuests((g) => g + 1)}
            >
              +
            </button>
          </div>
          <Input
            label="الملاحظات"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" className="flex-1" loading={actionLoading} onClick={() => void saveEdit()}>
              حفظ
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditMode(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs opacity-40">
        تتحدث هذه الصفحة تلقائياً كل {POLL_MS / 1000} ثوانٍ
      </p>

      <Link
        href={`/r/${reservation.restaurantSlug}`}
        className="block text-center text-sm underline opacity-60"
      >
        العودة لصفحة {reservation.restaurantName}
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  dir,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-sm opacity-60">{label}</span>
      <span
        className={`text-right text-sm ${highlight ? "font-bold text-[#d4af37]" : ""}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}
