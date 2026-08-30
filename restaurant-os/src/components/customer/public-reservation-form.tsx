"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { isValidSaudiPhone, saPhoneInputValue } from "@/lib/phone-sa";

type Slot = { time: string; label: string; available: boolean };

type RestaurantConfig = {
  name: string;
  nameAr?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  workingHours?: unknown;
  landingPageConfig?: unknown;
  receptionDepositAmount?: number | null;
  timezone?: string;
};

const SESSION_OPTIONS = [
  { value: "", label: "بدون تفضيل" },
  { value: "INDOOR", label: "داخلية" },
  { value: "OUTDOOR", label: "خارجية" },
  { value: "NO_PREFERENCE", label: "لا يهم" },
] as const;

function todayMinDate(timezone = "Asia/Riyadh"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

function maxGuestsFromConfig(raw: unknown, fallback = 20): number {
  if (!raw || typeof raw !== "object") return fallback;
  const cfg = raw as Record<string, unknown>;
  const n = Number(cfg.maxReservationGuests ?? cfg.maxGuestCount ?? cfg.maxGuests);
  if (Number.isFinite(n) && n >= 1) return Math.min(Math.floor(n), 100);
  return fallback;
}

function reservationTermsFromConfig(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const cfg = raw as Record<string, unknown>;
  const terms = cfg.reservationTerms ?? cfg.reservationPolicy ?? cfg.bookingTerms;
  return typeof terms === "string" && terms.trim() ? terms.trim() : null;
}

export function PublicReservationForm({
  slug,
  restaurant,
}: {
  slug: string;
  restaurant: RestaurantConfig;
}) {
  const router = useRouter();
  const timezone = restaurant.timezone || "Asia/Riyadh";
  const maxGuests = maxGuestsFromConfig(restaurant.landingPageConfig);
  const terms = reservationTermsFromConfig(restaurant.landingPageConfig);
  const minSpend = restaurant.receptionDepositAmount;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+966");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [sessionType, setSessionType] = useState("");
  const [occasion, setOccasion] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const idempotencyRef = useRef<string>("");

  const minDate = useMemo(() => todayMinDate(timezone), [timezone]);

  useEffect(() => {
    if (!date || date < minDate) {
      setSlots([]);
      setTime("");
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    fetch(`/api/public/reservations/slots?slug=${encodeURIComponent(slug)}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: Slot[] = data.slots || [];
        setSlots(list);
        if (time && !list.some((s) => s.time === time && s.available)) {
          setTime("");
        }
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, date, minDate, time]);

  const phoneValid = isValidSaudiPhone(phone);

  const validateClient = useCallback(() => {
    if (!name.trim() || name.trim().length < 2) return "الاسم مطلوب";
    if (!phoneValid) return "رقم الجوال غير صحيح";
    if (!date || date < minDate) return "التاريخ غير صالح";
    if (!time) return "اختر وقت الحجز";
    if (guests < 1 || guests > maxGuests) return `عدد الضيوف بين 1 و ${maxGuests}`;
    return "";
  }, [name, phoneValid, date, minDate, time, guests, maxGuests]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    if (loading) return;

    if (!idempotencyRef.current) {
      idempotencyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyRef.current,
        },
        body: JSON.stringify({
          slug,
          customerName: name.trim(),
          customerPhone: phone,
          date,
          time,
          guestCount: guests,
          sessionType: sessionType || null,
          occasion: occasion.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إرسال الحجز");
        setLoading(false);
        return;
      }
      const token = data.publicToken || data.reservation?.token;
      if (token) {
        router.push(`/reservation/${token}`);
        return;
      }
      setError("تم الحجز لكن تعذر فتح صفحة المتابعة");
    } catch {
      setError("تعذر الاتصال، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const primary = restaurant.primaryColor || "#d4af37";

  return (
    <form onSubmit={submit} className="space-y-5 pb-8">
      <Input
        label="الاسم"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسمك الكامل"
        required
        className="text-base"
      />

      <div>
        <Input
          label="رقم الجوال"
          value={phone}
          onChange={(e) => setPhone(saPhoneInputValue(e.target.value))}
          dir="ltr"
          inputMode="tel"
          placeholder="+966 5X XXX XXXX"
          required
          className="text-base tracking-wide"
        />
        {phone.length > 4 && !phoneValid && (
          <p className="mt-1 text-xs text-red-400">أدخل رقم سعودي صحيح يبدأ بـ 5</p>
        )}
      </div>

      <Input
        label="التاريخ"
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => setDate(e.target.value)}
        required
        className="text-base"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-[#faf7f2]/90">الوقت</p>
        {!date ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm opacity-60">
            اختر التاريخ أولاً
          </p>
        ) : slotsLoading ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm opacity-60">
            جاري تحميل الأوقات...
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            لا توجد أوقات متاحة في هذا اليوم
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = time === slot.time;
              const disabled = !slot.available;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTime(slot.time)}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    disabled
                      ? "cursor-not-allowed border-white/5 bg-white/5 opacity-35"
                      : selected
                        ? "border-transparent text-[#0c0a09]"
                        : "border-white/15 bg-white/5 hover:border-white/30"
                  }`}
                  style={selected && !disabled ? { backgroundColor: primary } : undefined}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#faf7f2]/90">عدد الضيوف</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="تقليل"
            disabled={guests <= 1}
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-2xl font-bold">{guests}</span>
          <button
            type="button"
            aria-label="زيادة"
            disabled={guests >= maxGuests}
            onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl disabled:opacity-30"
          >
            +
          </button>
        </div>
        <p className="mt-1 text-xs opacity-50">الحد الأقصى {maxGuests} ضيوف</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#faf7f2]/90">نوع الجلسة (اختياري)</p>
        <div className="flex flex-wrap gap-2">
          {SESSION_OPTIONS.map((opt) => {
            const active = sessionType === opt.value;
            return (
              <button
                key={opt.value || "none"}
                type="button"
                onClick={() => setSessionType(opt.value)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  active ? "text-[#0c0a09]" : "border border-white/15 bg-white/5"
                }`}
                style={active ? { backgroundColor: primary } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="المناسبة / الملاحظات (اختياري)"
        value={occasion ? occasion : notes}
        onChange={(e) => {
          setOccasion(e.target.value);
          setNotes(e.target.value);
        }}
        placeholder="مثال: عيد ميلاد، حساسية طعام..."
        className="text-base"
      />

      {(terms || minSpend) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed opacity-80">
          {minSpend != null && Number(minSpend) > 0 && (
            <p className="mb-2">الحد الأدنى للإنفاق: {Number(minSpend)} ر.س</p>
          )}
          {terms && <p>{terms}</p>}
          {!terms && (
            <p>بإرسال الطلب، أنت توافق على سياسة الحجز في المطعم. سيتم التواصل لتأكيد الحجز.</p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={loading || !phoneValid || !time}
        className="h-14 w-full text-base font-bold"
        style={{ backgroundColor: primary }}
      >
        تأكيد طلب الحجز
      </Button>
    </form>
  );
}
