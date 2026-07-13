"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Gift, X } from "lucide-react";

type GiftRow = {
  id: string;
  status: string;
  productName: string;
  productImageUrl?: string | null;
  totalAmount: number;
  giftMessage?: string | null;
  senderDisplayName?: string | null;
  isAnonymous?: boolean;
  senderTableNumber: string;
  expiresAt: string;
};

type Props = {
  tableId: string;
  locale?: "ar" | "en";
};

export function GiftIncomingModal({ tableId, locale = "ar" }: Props) {
  const [pending, setPending] = useState<GiftRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/public/gifts?tableId=${tableId}&role=receiver`);
        if (!res.ok) return;
        const data = await res.json();
        const p = (data.gifts || []).find(
          (g: GiftRow) => g.status === "PENDING_ACCEPTANCE"
        );
        setPending(p || null);
      } catch {
        /* ignore */
      }
    }
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [tableId]);

  async function respond(accept: boolean) {
    if (!pending) return;
    setLoading(true);
    await fetch(`/api/public/gifts/${pending.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverTableId: tableId, accept }),
    });
    setPending(null);
    setLoading(false);
  }

  if (!pending) return null;

  const from = pending.isAnonymous
    ? locale === "ar"
      ? "مهمّا"
      : "Someone"
    : pending.senderDisplayName || pending.senderTableNumber;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md animate-in slide-in-from-bottom rounded-2xl bg-white p-6 shadow-2xl" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-500" />
            <h2 className="text-lg font-bold">
              {locale === "ar" ? "🎁 هدية واردة!" : "🎁 Incoming Gift!"}
            </h2>
          </div>
          <button onClick={() => respond(false)} className="text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          {locale === "ar" ? "من" : "From"}: {from} ({locale === "ar" ? "طاولة" : "Table"} {pending.senderTableNumber})
        </p>
        <p className="mt-2 text-xl font-semibold">{pending.productName}</p>
        <p className="text-amber-600">{formatCurrency(pending.totalAmount)}</p>
        {pending.giftMessage && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm italic">&ldquo;{pending.giftMessage}&rdquo;</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" disabled={loading} onClick={() => respond(false)}>
            {locale === "ar" ? "رفض" : "Reject"}
          </Button>
          <Button className="flex-1" disabled={loading} onClick={() => respond(true)}>
            {locale === "ar" ? "قبول" : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}
