import { McShell } from "@/components/marketing-center/mc-shell";
import { McNav } from "@/components/marketing-center/mc-nav";

export default function MarketingCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <McShell>
      <McNav />
      {children}
    </McShell>
  );
}
