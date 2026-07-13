"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, LoadingSpinner } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Gift, ArrowRight, ArrowLeft } from "lucide-react";

type GiftTable = {
  tableId: string;
  tableNumber: string;
  tableLabel?: string | null;
  guestCount: number;
};

type MenuItem = {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  price: number;
  discountPrice?: number | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
};

type Locale = "ar" | "en";

const T = {
  ar: {
    title: "إهداء طاولة",
    pickTable: "اختر الطاولة المستلمة",
    pickItem: "اختر المنتج",
    message: "رسالة (اختياري)",
    anonymous: "إهداء مجهول",
    send: "إرسال الهدية",
    back: "رجوع للمنيو",
    noTables: "لا توجد طاولات نشطة أخرى",
    sent: "تم إرسال الهدية — بانتظار القبول",
    payTitle: "إتمام الدفع",
    pay: "ادفع الآن",
    paid: "تم الدفع — الطلب في المطبخ",
  },
  en: {
    title: "Gift a Table",
    pickTable: "Select receiving table",
    pickItem: "Select item",
    message: "Message (optional)",
    anonymous: "Send anonymously",
    send: "Send Gift",
    back: "Back to menu",
    noTables: "No other active tables",
    sent: "Gift sent — awaiting acceptance",
    payTitle: "Complete payment",
    pay: "Pay now",
    paid: "Paid — order sent to kitchen",
  },
};

export default function GiftPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = String(params.tableId);
  const locale = (searchParams.get("lang") === "en" ? "en" : "ar") as Locale;
  const t = T[locale];
  const preProductId = searchParams.get("productId");

  const [step, setStep] = useState<"table" | "item" | "done" | "pay">("table");
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<GiftTable[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(preProductId);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [giftId, setGiftId] = useState<string | null>(null);
  const [giftTotal, setGiftTotal] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tablesRes, menuRes] = await Promise.all([
        fetch(`/api/public/gifts?tableId=${tableId}&tables=1`),
        fetch(`/api/public/menu/${tableId}`),
      ]);
      const tablesData = await tablesRes.json();
      const menuData = await menuRes.json();
      if (!tablesRes.ok) throw new Error(tablesData.error || "Gifts unavailable");
      setTables(tablesData.tables || []);
      const flat: MenuItem[] = (menuData.categories || []).flatMap(
        (c: { items: MenuItem[]; children?: { items: MenuItem[] }[] }) => [
          ...c.items,
          ...(c.children || []).flatMap((s) => s.items),
        ]
      );
      setItems(flat.filter((i) => i.isAvailable !== false));
      if (preProductId) setStep("table");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setLoading(false);
  }, [tableId, preProductId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendGift() {
    if (!selectedTable || !selectedProduct) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderTableId: tableId,
        receiverTableId: selectedTable,
        productId: selectedProduct,
        giftMessage: message,
        isAnonymous: anonymous,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setGiftId(data.gift.id);
    setGiftTotal(data.gift.totalAmount);
    setStep("done");
  }

  async function payGift() {
    if (!giftId) return;
    setLoading(true);
    const res = await fetch(`/api/public/gifts/${giftId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderTableId: tableId, method: "MADA" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Payment failed");
      return;
    }
    setStep("pay");
  }

  // Poll for payment pending after send
  useEffect(() => {
    if (step !== "done" || !giftId) return;
    const iv = setInterval(async () => {
      const res = await fetch(`/api/public/gifts?tableId=${tableId}&role=sender`);
      const data = await res.json();
      const g = (data.gifts || []).find((x: { id: string; status: string }) => x.id === giftId);
      if (g?.status === "PAYMENT_PENDING") {
        setStep("pay");
      }
      if (g?.status === "REJECTED" || g?.status === "EXPIRED") {
        setError(g.status === "REJECTED" ? "Rejected" : "Expired");
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [step, giftId, tableId]);

  if (loading && tables.length === 0) return <LoadingSpinner />;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-stone-950 p-4 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Gift className="h-6 w-6 text-amber-400" />
          {t.title}
        </h1>
        <Link href={`/menu/${tableId}?direct=1`}>
          <Button variant="outline" size="sm">{t.back}</Button>
        </Link>
      </div>

      {error && <p className="mb-3 rounded bg-red-900/50 p-2 text-sm text-red-200">{error}</p>}

      {step === "table" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">{t.pickTable}</p>
          {tables.length === 0 ? (
            <p className="text-stone-500">{t.noTables}</p>
          ) : (
            tables.map((tbl) => (
              <button
                key={tbl.tableId}
                onClick={() => {
                  setSelectedTable(tbl.tableId);
                  setStep("item");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-stone-700 bg-stone-900 p-4 text-right hover:border-amber-500"
              >
                <span className="font-semibold">
                  {locale === "ar" ? "طاولة" : "Table"} {tbl.tableNumber}
                  {tbl.tableLabel ? ` (${tbl.tableLabel})` : ""}
                </span>
                {locale === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            ))
          )}
        </div>
      )}

      {step === "item" && (
        <div className="space-y-3">
          <button onClick={() => setStep("table")} className="text-sm text-amber-400">← {t.pickTable}</button>
          <p className="text-sm text-stone-400">{t.pickItem}</p>
          {items.map((item) => {
            const price = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedProduct(item.id)}
                className={`flex w-full gap-3 rounded-xl border p-3 text-right ${
                  selectedProduct === item.id ? "border-amber-500 bg-amber-950/30" : "border-stone-700 bg-stone-900"
                }`}
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{locale === "en" && item.nameEn ? item.nameEn : item.nameAr || item.name}</p>
                  <p className="text-amber-400">{formatCurrency(price)}</p>
                </div>
              </button>
            );
          })}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.message}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            {t.anonymous}
          </label>
          <Button
            className="w-full"
            disabled={!selectedProduct || loading}
            onClick={sendGift}
          >
            {t.send}
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 text-center">
          <p className="text-lg">{t.sent}</p>
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-4 rounded-xl border border-amber-600/50 bg-stone-900 p-6">
          <h2 className="text-lg font-bold text-amber-400">{t.payTitle}</h2>
          <p className="text-2xl font-bold">{formatCurrency(giftTotal)}</p>
          <Button className="w-full" onClick={payGift} disabled={loading}>
            {t.pay}
          </Button>
          <p className="text-center text-sm text-green-400">{t.paid}</p>
        </div>
      )}
    </div>
  );
}
