"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, LoadingSpinner } from "@/components/ui";
import { Printer } from "lucide-react";

interface QrData {
  table: {
    id: string;
    number: number;
    label?: string;
    branch: {
      name: string;
      nameAr?: string;
      restaurant: { name: string; nameAr?: string; logoUrl?: string };
    };
  };
  menuUrl: string;
  qrDataUrl: string;
}

export default function QrPrintPage() {
  const params = useParams();
  const tableId = params.tableId as string;
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/qr?tableId=${tableId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("الطاولة غير موجودة"))
      .finally(() => setLoading(false));
  }, [tableId]);

  if (loading) return <LoadingSpinner />;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const restaurant = data.table.branch.restaurant;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-sm text-center print:max-w-none">
        {restaurant.logoUrl && (
          <img
            src={restaurant.logoUrl}
            alt=""
            className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
          />
        )}
        <h1 className="text-2xl font-bold text-gray-900">
          {restaurant.nameAr || restaurant.name}
        </h1>
        <p className="mt-1 text-gray-500">
          {data.table.branch.nameAr || data.table.branch.name}
        </p>
        <p className="mt-4 text-3xl font-bold text-emerald-700">
          طاولة {data.table.number}
        </p>

        <div className="my-8 flex justify-center">
          <img
            src={data.qrDataUrl}
            alt="QR Code"
            className="h-64 w-64 rounded-xl border-4 border-emerald-600 p-2"
          />
        </div>

        <p className="text-sm text-gray-500">امسح الرمز لعرض القائمة والطلب</p>
        <p className="mt-2 break-all text-xs text-gray-400" dir="ltr">
          {data.menuUrl}
        </p>

        <Button
          className="mt-8 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
