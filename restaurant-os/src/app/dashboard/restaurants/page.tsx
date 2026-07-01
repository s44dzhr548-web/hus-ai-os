"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from "@/components/ui";
import { Store } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  isActive: boolean;
  currency: string;
  defaultPaymentProvider: string;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => setRestaurants(Array.isArray(data) ? data : data ? [data] : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="المطاعم"
        description="إدارة مطاعمك على المنصة"
      />

      {restaurants.length === 0 ? (
        <EmptyState title="لا توجد مطاعم" description="أنشئ مطعمك من صفحة المطعm" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{r.nameAr || r.name}</h3>
                  <p className="text-sm text-gray-500">{r.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={r.isActive ? "success" : "danger"}>
                      {r.isActive ? "نشط" : "معطل"}
                    </Badge>
                    <Badge>{r.currency}</Badge>
                    <Badge variant="info">{r.defaultPaymentProvider}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
