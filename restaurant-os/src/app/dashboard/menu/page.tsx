"use client";

import Link from "next/link";
import { PageHeader, Card, Button } from "@/components/ui";
import { FolderOpen, List } from "lucide-react";

export default function MenuOverviewPage() {
  return (
    <div>
      <PageHeader title="المنيو" description="نظّم أقسام المنيو ومنتجاتك" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <FolderOpen className="h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-semibold">أقسام المنيو</h3>
          <p className="mt-1 text-sm text-gray-500">
            أنشئ أقساماً رئيسية وفرعية (مقبلات، أطباق، مشروبات...)
          </p>
          <Link href="/dashboard/menu/categories">
            <Button className="mt-4">إدارة المنيو</Button>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <List className="h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-semibold">المنتجات</h3>
          <p className="mt-1 text-sm text-gray-500">
            أضف المنتجات مع الصور والفيديو داخل كل قسم
          </p>
          <Link href="/dashboard/menu/categories">
            <Button variant="outline" className="mt-4">فتح المنيو</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
