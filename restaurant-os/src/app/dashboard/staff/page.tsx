"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Badge,
  Modal,
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Input,
} from "@/components/ui";
import { STAFF_ROLE_LABELS } from "@/lib/utils";
import { UserPlus, Key, Ban, Trash2, CheckCircle } from "lucide-react";

interface StaffRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { id: "RECEPTION", label: "استقبال" },
  { id: "MANAGER", label: "مدير" },
  { id: "WAITER", label: "نادل" },
  { id: "KITCHEN", label: "مطبخ" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "RECEPTION",
    isActive: true,
  });

  async function load() {
    const res = await fetch("/api/staff");
    if (res.ok) {
      const data = await res.json();
      setStaff(data.staff || []);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "تعذر إنشاء الموظف");
      return;
    }
    setCreateOpen(false);
    setForm({ name: "", email: "", phone: "", password: "", role: "RECEPTION", isActive: true });
    load();
  }

  async function patchStaff(id: string, body: Record<string, unknown>) {
    await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  async function resetPassword() {
    if (!resetModal || !newPassword) return;
    setSaving(true);
    await patchStaff(resetModal.id, { resetPassword: true, newPassword });
    setSaving(false);
    setResetModal(null);
    setNewPassword("");
  }

  async function deleteStaff(id: string) {
    if (!confirm("حذف حساب الموظف؟")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        description="إدارة حسابات موظفي الاستقبال والفريق"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> إضافة موظف استقبال
          </Button>
        }
      />

      {staff.length === 0 ? (
        <EmptyState title="لا يوجد موظفون" description="أضف موظف استقبال للبدء" />
      ) : (
        <div className="grid gap-3">
          {staff.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-gray-500" dir="ltr">{s.email}</p>
                  {s.phone && <p className="text-sm text-gray-500" dir="ltr">{s.phone}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{STAFF_ROLE_LABELS[s.role] || s.role}</Badge>
                    <Badge variant={s.isActive ? "success" : "default"}>
                      {s.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResetModal({ id: s.id, name: s.name })}
                  >
                    <Key className="h-4 w-4" /> إعادة كلمة المرور
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => patchStaff(s.id, { isActive: !s.isActive })}
                  >
                    {s.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    {s.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteStaff(s.id)}>
                    <Trash2 className="h-4 w-4" /> حذف
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إضافة موظف">
        <form onSubmit={createStaff} className="space-y-4">
          <Input label="الاسم الكامل" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="البريد الإلكتروني" type="email" required dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="رقم الجوال" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="كلمة مرور مؤقتة" type="password" required dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-lg border px-3 py-2"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            حساب نشط
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={saving} className="w-full">إنشاء</Button>
        </form>
      </Modal>

      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title={`إعادة كلمة المرور — ${resetModal?.name}`}>
        <div className="space-y-4">
          <Input label="كلمة المرور الجديدة" type="password" required dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button onClick={resetPassword} loading={saving} className="w-full">حفظ</Button>
        </div>
      </Modal>
    </div>
  );
}
