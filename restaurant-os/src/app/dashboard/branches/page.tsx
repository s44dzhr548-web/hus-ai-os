"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Input,
  Button,
  Badge,
  Modal,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  _count?: { tables: number; orders: number };
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", nameAr: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/branches")
      .then((r) => r.json())
      .then(setBranches)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ name: "", nameAr: "", address: "", phone: "" });
    load();
  }

  async function toggleActive(branch: Branch) {
    await fetch("/api/branches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: branch.id, isActive: !branch.isActive }),
    });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="الفروع"
        description="إدارة فروع المطعم"
        action={
          <Button onClick={() => setModalOpen(true)}>إضافة فرع</Button>
        }
      />

      {branches.length === 0 ? (
        <EmptyState
          title="لا توجد فروع"
          description="أضف فرعك الأول للبدء"
          action={<Button onClick={() => setModalOpen(true)}>إضافة فرع</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{branch.nameAr || branch.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{branch.address}</p>
                  <p className="text-sm text-gray-500" dir="ltr">
                    {branch.phone}
                  </p>
                </div>
                <Badge variant={branch.isActive ? "success" : "danger"}>
                  {branch.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <span>{branch._count?.tables ?? 0} طاولة</span>
                <span>{branch._count?.orders ?? 0} طلب</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => toggleActive(branch)}
              >
                {branch.isActive ? "تعطيل" : "تفعيل"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة فرع">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="اسم الفرع"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value, name: e.target.value })}
            required
          />
          <Input
            label="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
          />
          <Button type="submit" className="w-full" loading={saving}>
            حفظ
          </Button>
        </form>
      </Modal>
    </div>
  );
}
