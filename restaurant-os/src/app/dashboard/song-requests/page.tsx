"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";
import { SONG_STATUS_LABELS_AR } from "@/lib/song-requests/types";
import { Music } from "lucide-react";
import type { SongRequestStatus } from "@prisma/client";

type SongRow = {
  id: string;
  songName: string;
  artistName: string | null;
  status: SongRequestStatus;
  statusLabel: string;
  targetLabel: string;
  tableNumber: string | null;
  dedicationMessage: string | null;
  createdAt: string;
};

export default function SongRequestsDashboardPage() {
  const [requests, setRequests] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/song-requests");
    if (res.ok) {
      const d = await res.json();
      setRequests(d.requests || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  async function updateStatus(requestId: string, status: SongRequestStatus) {
    await fetch("/api/song-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات الأغاني"
        description="طلبات تشغيل الأغاني من العملاء"
        action={
          <Link href="/dashboard/gifts">
            <Button variant="outline">إعدادات التفعيل</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-3 py-2">الأغنية</th>
                <th className="px-3 py-2">الفنان</th>
                <th className="px-3 py-2">الطاولة</th>
                <th className="px-3 py-2">الهدف</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    <Music className="mx-auto mb-2 h-8 w-8 text-violet-400" />
                    لا توجد طلبات أغاني حالياً
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{r.songName}</td>
                    <td className="px-3 py-2">{r.artistName || "—"}</td>
                    <td className="px-3 py-2">{r.tableNumber || "—"}</td>
                    <td className="px-3 py-2">{r.targetLabel}</td>
                    <td className="px-3 py-2">
                      <Badge>{SONG_STATUS_LABELS_AR[r.status] || r.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(r.createdAt).toLocaleString("ar-SA")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.status === "PENDING_REVIEW" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(r.id, "ACCEPTED")}
                            >
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(r.id, "REJECTED")}
                            >
                              رفض
                            </Button>
                          </>
                        )}
                        {r.status === "ACCEPTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(r.id, "PLAYING")}
                          >
                            تشغيل
                          </Button>
                        )}
                        {r.status === "PLAYING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(r.id, "PLAYED")}
                          >
                            تم التشغيل
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
