"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  CardTitle,
  Badge,
  Button,
  Input,
  Modal,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";

interface Customer {
  id: string;
  phone?: string;
  name?: string;
  totalPoints: number;
  _count?: { orders: number };
}

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number | string;
  isActive: boolean;
  usedCount: number;
  maxUses?: number;
}

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: "", value: "10" });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/loyalty")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers || []);
        setCoupons(data.coupons || []);
        setTotalPoints(data.totalPointsIssued || 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "coupon",
        code: form.code,
        value: parseFloat(form.value),
        couponType: "PERCENTAGE",
      }),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ code: "", value: "10" });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="برنامج الولاء"
        description="العملاء والنقاط والكوبونات"
        action={<Button onClick={() => setModalOpen(true)}>كوبون جديد</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">إجمالي العملاء</p>
          <p className="mt-1 text-2xl font-bold">{customers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">النقاط الممنوحة</p>
          <p className="mt-1 text-2xl font-bold">{totalPoints}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">الكوبونات النشطة</p>
          <p className="mt-1 text-2xl font-bold">
            {coupons.filter((c) => c.isActive).length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>العملاء</CardTitle>
          {customers.length === 0 ? (
            <EmptyState title="لا يوجد عملاء بعد" />
          ) : (
            <div className="mt-4 space-y-2">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="font-medium" dir="ltr">
                      {c.phone || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c._count?.orders ?? 0} زيارة
                    </p>
                  </div>
                  <Badge variant="success">{c.totalPoints} نقطة</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>الكوبونات</CardTitle>
          {coupons.length === 0 ? (
            <EmptyState title="لا توجد كوبونات" />
          ) : (
            <div className="mt-4 space-y-2">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="font-bold" dir="ltr">
                      {c.code}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Number(c.value)}% · {c.usedCount}/{c.maxUses ?? "∞"} استخدام
                    </p>
                  </div>
                  <Badge variant={c.isActive ? "success" : "danger"}>
                    {c.isActive ? "نشط" : "منتهي"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="كوبون جديد">
        <form onSubmit={createCoupon} className="space-y-4">
          <Input
            label="كود الكوبون"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
            dir="ltr"
          />
          <Input
            label="نسبة الخصم %"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
            dir="ltr"
          />
          <Button type="submit" className="w-full" loading={saving}>
            إنشاء
          </Button>
        </form>
      </Modal>
    </div>
  );
}
