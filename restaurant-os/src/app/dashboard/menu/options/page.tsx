"use client";

import { useEffect, useState } from "react";
import { Button, Input, LoadingSpinner } from "@/components/ui";

interface Option {
  name: string;
  nameAr?: string;
  price: number;
}

interface OptionGroup {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  isRequired: boolean;
  options: Option[];
}

export default function MenuOptionsPage() {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("0");

  const load = () =>
    fetch("/api/menu/options")
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function addGroup() {
    if (!name.trim()) return;
    await fetch("/api/menu/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group: {
          name,
          nameAr: name,
          type: "ADDON",
          isRequired: false,
          options: optionName
            ? [{ name: optionName, nameAr: optionName, price: Number(optionPrice) || 0 }]
            : [],
        },
      }),
    });
    setName("");
    setOptionName("");
    setOptionPrice("0");
    load();
  }

  async function removeGroup(id: string) {
    await fetch(`/api/menu/options?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">خيارات وإضافات المنتجات</h1>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 font-semibold">إضافة مجموعة خيارات</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="اسم المجموعة (مثال: الحجم)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="خيار (مثال: كبير)" value={optionName} onChange={(e) => setOptionName(e.target.value)} />
          <Input placeholder="سعر الإضافة" type="number" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} />
        </div>
        <Button className="mt-4" onClick={addGroup}>
          إضافة
        </Button>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="rounded-xl bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{g.nameAr || g.name}</p>
                <p className="text-sm text-gray-500">{g.type} · {g.isRequired ? "إلزامي" : "اختياري"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => removeGroup(g.id)}>
                حذف
              </Button>
            </div>
            <ul className="mt-2 text-sm text-gray-600">
              {g.options.map((o, i) => (
                <li key={i}>
                  {o.nameAr || o.name} — {o.price} ر.س
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
