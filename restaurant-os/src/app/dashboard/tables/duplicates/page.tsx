"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";

type DuplicateGroup = {
  normalizedNumber: string;
  branchId: string;
  branchName: string;
  tables: Array<{
    tableId: string;
    displayNumber: string;
    activeOrders: number;
    reservations: number;
    sessions: number;
    hasQr: boolean;
  }>;
};

export default function TableDuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState("");

  async function load() {
    const res = await fetch("/api/tables/duplicates");
    if (!res.ok) {
      setError("تعذر تحميل تقرير التكرار");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setGroups(data.groups || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function renameTable(tableId: string) {
    if (!newNumber.trim()) return;
    const res = await fetch("/api/tables/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rename_duplicate",
        tableId,
        newDisplayNumber: newNumber.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل إعادة التسمية");
      return;
    }
    setRenameId(null);
    setNewNumber("");
    setError("");
    load();
  }

  async function archiveTable(tableId: string) {
    if (!confirm("أرشفة هذه الطاولة المكررة؟ لن يتم حذف أي بيانات تاريخية.")) return;
    const res = await fetch("/api/tables/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive_duplicate", tableId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل الأرشفة");
      return;
    }
    setError("");
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تكرار أرقام الطاولات"
        description="تقرير للطاولات التي تشترك في نفس الرقم المنطقي (عربي/فارسي/إنجليزي). الحل يدوي دون حذف بيانات."
        action={
          <Link href="/dashboard/tables">
            <Button variant="outline">العودة للطاولات</Button>
          </Link>
        }
      />

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {groups.length === 0 ? (
        <Card className="p-6 text-center text-gray-600">لا توجد تكرارات نشطة — البيانات الحالية سليمة.</Card>
      ) : (
        groups.map((g) => (
          <Card key={`${g.branchId}-${g.normalizedNumber}`} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">{g.branchName}</h3>
              <Badge>الرقم الموحّد: {g.normalizedNumber}</Badge>
            </div>
            <div className="space-y-2">
              {g.tables.map((t) => (
                <div
                  key={t.tableId}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">طاولة {t.displayNumber}</p>
                    <p className="text-xs text-gray-600">
                      طلبات نشطة: {t.activeOrders} · حجوزات: {t.reservations} · جلسات: {t.sessions}
                      {t.hasQr ? " · QR" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setRenameId(t.tableId)}>
                      إعادة تسمية
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => archiveTable(t.tableId)}
                      disabled={t.activeOrders > 0 || t.sessions > 0}
                    >
                      أرشفة
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      {renameId && (
        <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md space-y-3 p-4 shadow-xl sm:inset-x-auto sm:right-6">
          <p className="font-medium">رقم جديد للطاولة</p>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="مثال: 124 أو طاولة B2"
          />
          <div className="flex gap-2">
            <Button onClick={() => renameTable(renameId)}>حفظ</Button>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              إلغاء
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
