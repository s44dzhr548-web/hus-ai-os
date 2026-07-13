import { Suspense } from "react";
import { MarketingShell, MkLoading } from "@/components/marketing/marketing-shell";
import { MarketingSubNav } from "@/components/marketing/marketing-sub-nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <Suspense fallback={<MkLoading />}>
        <MarketingSubNav />
      </Suspense>
      {children}
    </MarketingShell>
  );
}
