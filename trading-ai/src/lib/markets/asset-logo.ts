import { getAssetBySymbol } from "./asset-universe";
import { hashSymbol } from "@/lib/data/seed";

const PALETTE = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export function getAssetInitials(symbol: string, name?: string): string {
  const asset = getAssetBySymbol(symbol);
  const label = name ?? asset?.name ?? symbol;
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function getAssetLogoColor(symbol: string): string {
  return PALETTE[hashSymbol(symbol) % PALETTE.length];
}

export function getAssetLogoProps(symbol: string, name?: string) {
  return {
    initials: getAssetInitials(symbol, name),
    color: getAssetLogoColor(symbol),
  };
}
