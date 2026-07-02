"use client";
import { SymbolIntelligenceClient } from "@/components/symbol-intelligence-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function WhatMustChangePage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.whatMustChange.title} subtitle={t.whatMustChange.subtitle} /><SymbolIntelligenceClient module="what-must-change" /></div>);
}
