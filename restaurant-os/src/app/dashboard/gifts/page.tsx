"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";
import { GIFT_STATUS_LABELS_AR } from "@/lib/table-gifts/types";
import { formatCurrency } from "@/lib/utils";
import { Gift } from "lucide-react";

type GiftRow = {
  id: string;
  status: string;
  productName: string;
  senderTableNumber: string;
  receiverTableNumber: string;
  totalAmount: number;
  createdAt: string;
};

export default function GiftsDashboardPage() {
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [settings, setSettings] = useState({
    enabled: false,
    acceptanceTimeoutMinutes: 2,
    allowAnonymous: true,
    showSenderName: true,
    wishesEnabled: false,
    songRequestsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [gRes, sRes] = await Promise.all([
      fetch("/api/gifts"),
      fetch("/api/restaurants/gift-settings"),
    ]);
    if (gRes.ok) {
      const d = await gRes.json();
      setGifts(d.gifts || []);
    }
    if (sRes.ok) {
      const d = await sRes.json();
      setSettings(d.settings);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/restaurants/gift-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
  }

  async function markDelivered(giftId: string) {
    await fetch("/api/gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giftId, status: "DELIVERED" }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تجربة العميل — الإهداء والأمنيات والأغاني"
        description="إدارة الإهداء بين الطاولات، الأمنيات، وطلبات الأغاني"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/wishes">
              <Button variant="outline">الأمنيات</Button>
            </Link>
            <Link href="/dashboard/song-requests">
              <Button variant="outline">طلبات الأغاني</Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline">إعدادات المطعم</Button>
            </Link>
          </div>
        }
      />

      <Card className="space-y-4 p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Gift className="h-5 w-5 text-amber-500" />
          إعدادات تجربة العميل
        </h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          تفعيل الإهداء
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.wishesEnabled}
            onChange={(e) =>
              setSettings({ ...settings, wishesEnabled: e.target.checked })
            }
          />
          تفعيل الأمنيات
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.songRequestsEnabled}
            onChange={(e) =>
              setSettings({ ...settings, songRequestsEnabled: e.target.checked })
            }
          />
          تفعيل طلب الأغاني
        </label>
        <hr className="border-gray-200" />
        <p className="text-sm font-medium text-gray-700">إعدادات الإهداء</p>
        <label className="block text-sm">
          مهلة القبول (دقائق)
          <input
            type="number"
            min={1}
            max={30}
            value={settings.acceptanceTimeoutMinutes}
            onChange={(e) =>
              setSettings({
                ...settings,
                acceptanceTimeoutMinutes: parseInt(e.target.value) || 2,
              })
            }
            className="mt-1 w-24 rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.allowAnonymous}
            onChange={(e) =>
              setSettings({ ...settings, allowAnonymous: e.target.checked })
            }
          />
          السماح بالإهداء المجهول
        </label>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "..." : "حفظ الإعدادات"}
        </Button>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-3 py-2">المنتج</th>
                <th className="px-3 py-2">من</th>
                <th className="px-3 py-2">إلى</th>
                <th className="px-3 py-2">المبلغ</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((g) => (
                <tr key={g.id} className="border-b">
                  <td className="px-3 py-2">{g.productName}</td>
                  <td className="px-3 py-2">{g.senderTableNumber}</td>
                  <td className="px-3 py-2">{g.receiverTableNumber}</td>
                  <td className="px-3 py-2">{formatCurrency(g.totalAmount)}</td>
                  <td className="px-3 py-2">
                    <Badge>{GIFT_STATUS_LABELS_AR[g.status] || g.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(g.createdAt).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-3 py-2">
                    {g.status === "READY" || g.status === "PREPARING" ? (
                      <Button size="sm" variant="outline" onClick={() => markDelivered(g.id)}>
                        تم التسليم
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
