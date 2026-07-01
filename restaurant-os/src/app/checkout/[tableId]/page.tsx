"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, LoadingSpinner } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { getCart, clearCart, cartTotal, type CartItem } from "@/lib/cart";
import { ArrowRight, CreditCard, Tag } from "lucide-react";

const TIP_OPTIONS = [0, 5, 10, 20];

interface PaymentMethod {
  type: string;
  label: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [method, setMethod] = useState("MADA");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [provider, setProvider] = useState("MOYASAR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const items = getCart(tableId);
    if (!items.length) {
      router.replace(`/menu/${tableId}`);
      return;
    }
    setCart(items);

    fetch(`/api/checkout?tableId=${tableId}`)
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods || []);
        setProvider(data.provider || "MOYASAR");
        if (data.methods?.[0]) setMethod(data.methods[0].type);
      })
      .catch(() => {});
  }, [tableId, router]);

  const subtotal = cartTotal(cart);
  const tipAmount = customTip ? parseFloat(customTip) || 0 : tip;
  const total = Math.max(0, subtotal - couponDiscount + tipAmount);

  async function applyCoupon() {
    setCouponError("");
    setCouponDiscount(0);
    if (!couponCode.trim()) return;

    const menuRes = await fetch(`/api/public/menu/${tableId}`);
    const menu = await menuRes.json();

    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        restaurantId: menu.restaurant.id,
        subtotal,
      }),
    });
    const data = await res.json();
    if (data.valid) {
      setCouponDiscount(data.discount);
    } else {
      setCouponError(data.error || "كوبون غير صالح");
    }
  }

  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: cart.map((i) => ({
            menuItemId: i.id,
            quantity: i.quantity,
          })),
          tip: tipAmount,
          method,
          customerPhone: phone || undefined,
          customerName: customerName || undefined,
          couponCode: couponDiscount > 0 ? couponCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل الدفع");
        setLoading(false);
        return;
      }

      clearCart(tableId);
      router.push(`/order-status/${data.orderId}`);
    } catch {
      setError("تعذر إتمام الدفع");
      setLoading(false);
    }
  }

  if (!cart.length) return <LoadingSpinner />;

  const providerLabel =
    provider === "TAP" ? "Tap" : provider === "STRIPE" ? "Stripe" : "Moyasar";

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={`/menu/${tableId}`}>
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold">الدفع</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">ملخص الطلب</h2>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2 text-sm text-gray-600">
            <span>المجموع</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between py-1 text-sm text-emerald-600">
              <span>خصم الكوبون</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Tag className="h-4 w-4" />
            كوبون خصم
          </h2>
          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              dir="ltr"
            />
            <Button type="button" variant="outline" onClick={applyCoupon}>
              تطبيق
            </Button>
          </div>
          {couponError && (
            <p className="mt-2 text-sm text-red-600">{couponError}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">إكرامية (اختياري)</h2>
          <div className="flex flex-wrap gap-2">
            {TIP_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTip(t);
                  setCustomTip("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  tip === t && !customTip
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {t === 0 ? "بدون" : `${t} ر.س`}
              </button>
            ))}
          </div>
          <Input
            className="mt-3"
            label="مبلغ مخصص"
            type="number"
            placeholder="0"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">طريقة الدفع</h2>
          <p className="mb-3 text-xs text-gray-500">
            الدفع مباشرة للمطعم عبر {providerLabel} — لا يمر عبر المنصة
          </p>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.type}
                onClick={() => setMethod(m.type)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium ${
                  method === m.type
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="اسمك (اختياري)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="محمد"
        />
        <Input
          label="رقم الجوال (اختياري — للولاء)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05xxxxxxxx"
          dir="ltr"
        />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <div className="rounded-2xl bg-emerald-800 p-4 text-white">
          <div className="flex justify-between text-lg font-bold">
            <span>الإجمالي</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {tipAmount > 0 && (
            <p className="mt-1 text-sm text-emerald-200">
              شامل إكرامية {formatCurrency(tipAmount)}
            </p>
          )}
        </div>

        <Button className="w-full" size="lg" loading={loading} onClick={handlePay}>
          ادفع {formatCurrency(total)}
        </Button>
      </main>
    </div>
  );
}
