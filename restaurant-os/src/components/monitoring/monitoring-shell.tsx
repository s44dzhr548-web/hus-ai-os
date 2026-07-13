"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui";

const TABS = [
  { href: "/dashboard/monitoring", label: "الملخص" },
  { href: "/dashboard/monitoring/visits", label: "سجل العملاء" },
  { href: "/dashboard/monitoring/staff", label: "أداء الموظفين" },
  { href: "/dashboard/monitoring/login-history", label: "سجل الدخول" },
  { href: "/dashboard/monitoring/audit", label: "سجل التدقيق" },
];

export function MonitoringShell({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="pb-8">
      <PageHeader
        title="لوحة مراقبة المطعم"
        description={description ?? "مراقبة حية للعملاء والموظفين والنشاط — للمالك فقط"}
      />
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/dashboard/monitoring"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-b-2 border-emerald-600 text-emerald-800"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
