"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Modal,
  Badge,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { QrCode, Download } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
}

interface Table {
  id: string;
  number: number;
  label?: string;
  capacity: number;
  isActive: boolean;
  qrCode?: string;
  branch: { name: string; nameAr?: string };
}

interface QrData {
  menuUrl: string;
  qrDataUrl: string;
}

export default function TablesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState("10");
  const [qrModal, setQrModal] = useState<{ table: Table; qr: QrData } | null>(null);
  const [form, setForm] = useState({ number: "", capacity: "4" });
  const [saving, setSaving] = useState(false);

  function loadTables(bId?: string) {
    const q = bId ? `?branchId=${bId}` : "";
    fetch(`/api/tables${q}`)
      .then((r) => r.json())
      .then((data) => setTables(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        if (Array.isArray(data)) {
          setBranches(data);
          if (data[0]) {
            setBranchId(data[0].id);
            loadTables(data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (branchId) loadTables(branchId);
  }, [branchId]);

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, branchId, count: bulkCount }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(data.error || "فشل الإنشاء");
      return;
    }
    setBulkOpen(false);
    loadTables(branchId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        number: form.number,
        capacity: form.capacity,
      }),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ number: "", capacity: "4" });
    loadTables(branchId);
  }

  async function showQr(table: Table) {
    const res = await fetch(`/api/qr?tableId=${table.id}`);
    const data = await res.json();
    if (res.ok) setQrModal({ table, qr: data });
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="الطاولات و QR"
        description="إدارة الطاولات وتوليد رموز QR"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                branchId &&
                window.open(`/api/qr/print?branchId=${branchId}`, "_blank")
              }
            >
              <Download className="h-4 w-4" />
              تصدير QR
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              إنشاء جماعي
            </Button>
            <Button onClick={() => setModalOpen(true)}>إضافة طاولة</Button>
          </div>
        }
      />

      {branches.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select
            label="الفرع"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr || b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState
          title="لا توجد طاولات"
          action={<Button onClick={() => setModalOpen(true)}>إضافة طاولة</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">طاولة {table.number}</h3>
                  <p className="text-sm text-gray-500">{table.label}</p>
                  <p className="text-xs text-gray-400">سعة {table.capacity} أشخاص</p>
                </div>
                <Badge variant={table.isActive ? "success" : "danger"}>
                  {table.isActive ? "نشطة" : "معطلة"}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => showQr(table)}>
                  <QrCode className="h-4 w-4" />
                  توليد QR
                </Button>
                <Link href={`/menu/${table.id}`} target="_blank">
                  <Button variant="outline" size="sm">القائمة</Button>
                </Link>
                <Link href={`/qr/${table.id}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    طباعة
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة طاولة">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="رقم الطاولة"
            type="number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            required
          />
          <Input
            label="السعة"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <Button type="submit" className="w-full" loading={saving}>
            حفظ
          </Button>
        </form>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="إنشاء طاولات جماعي">
        <form onSubmit={handleBulkCreate} className="space-y-4">
          <Input
            label="عدد الطاولات"
            type="number"
            min={1}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={saving}>
            إنشاء
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!qrModal}
        onClose={() => setQrModal(null)}
        title={`QR — طاولة ${qrModal?.table.number}`}
      >
        {qrModal && (
          <div className="text-center">
            <img
              src={qrModal.qr.qrDataUrl}
              alt="QR Code"
              className="mx-auto h-64 w-64 rounded-xl border-4 border-emerald-600 p-2"
            />
            <p className="mt-4 text-sm text-gray-500">امسح الرمز لفتح القائمة</p>
            <p className="mt-2 break-all text-xs text-gray-400" dir="ltr">
              {qrModal.qr.menuUrl}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href={`/qr/${qrModal.table.id}`} target="_blank" className="flex-1">
                <Button className="w-full">صفحة الطباعة</Button>
              </Link>
              <a href={qrModal.qr.qrDataUrl} download={`qr-table-${qrModal.table.number}.png`}>
                <Button variant="outline">تحميل</Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
