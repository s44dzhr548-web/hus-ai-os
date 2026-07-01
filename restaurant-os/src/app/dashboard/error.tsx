"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-bold text-gray-900">حدث خطأ</h2>
      <p className="mt-2 text-sm text-gray-500">
        {error.message || "تعذر تحميل هذه الصفحة"}
      </p>
      <Button className="mt-6" onClick={reset}>
        إعادة المحاولة
      </Button>
    </div>
  );
}
