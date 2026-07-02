"use client";
import { AutoBotClient } from "@/components/auto-bot-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function AutoBotPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.autoBot.title} subtitle={t.autoBot.subtitle} /><AutoBotClient /></div>);
}
