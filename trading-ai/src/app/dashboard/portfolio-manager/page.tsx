"use client";
import { PortfolioManagerClient } from "@/components/portfolio-manager-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function PortfolioManagerPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.portfolioManager.title} subtitle={t.portfolioManager.subtitle} /><PortfolioManagerClient /></div>);
}
