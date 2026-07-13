import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingSubNav } from "@/components/marketing/marketing-sub-nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <MarketingSubNav />
      {children}
    </MarketingShell>
  );
}
