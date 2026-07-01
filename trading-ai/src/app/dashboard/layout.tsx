import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { TradingShell } from "@/components/trading-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DisclaimerBanner />
      <TradingShell>{children}</TradingShell>
    </>
  );
}
