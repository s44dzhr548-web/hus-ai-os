"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";

type TimelineRow = {
  id: string;
  actionLabel: string;
  date: string;
  time: string;
  customerName?: string | null;
  table?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  result: string;
};

export default function StaffActivityDetailPage() {
  const params = useParams();
  const userId = String(params.userId);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/staff-activity/${userId}`)
      .then((r) => r.json())
      .then((d) => setTimeline(d.timeline ?? []))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تفاصيل نشاط الموظف"
        description="سجل زمني لجميع الإجراءات"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/staff/activity">
              <Button variant="outline">رجوع</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `/api/staff-activity/export?type=timeline&userId=${userId}&format=csv`,
                  "_blank"
                )
              }
            >
              تصدير CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : timeline.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">لا توجد أحداث مسجلة</Card>
      ) : (
        <div className="space-y-3">
          {timeline.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{e.actionLabel}</p>
                  <p className="text-sm text-gray-500">
                    {e.date} · {e.time}
                  </p>
                  {e.customerName && (
                    <p className="text-sm">العميل: {e.customerName}</p>
                  )}
                  {e.table && <p className="text-sm">الطاولة: {e.table}</p>}
                  {(e.previousValue || e.newValue) && (
                    <p className="mt-1 text-xs text-gray-600">
                      {e.previousValue && <>قبل: {e.previousValue} · </>}
                      {e.newValue && <>بعد: {e.newValue}</>}
                    </p>
                  )}
                  {e.ipAddress && (
                    <p className="text-xs text-gray-400">IP: {e.ipAddress}</p>
                  )}
                </div>
                <Badge variant={e.result === "success" ? "default" : "danger"}>
                  {e.result === "success" ? "نجاح" : "فشل"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
