import type { DataAdapter } from "@/types/trading";
import { getProviderHealth } from "@/lib/market/unified";
import { getDataMode } from "@/lib/market/config";

export const DATA_ADAPTERS: DataAdapter[] = getProviderHealth().map((p) => ({
  id: p.id,
  name: p.name,
  assetClasses: p.assetClasses,
  status: p.status,
  hasApiKey: p.hasApiKey,
  description: p.description,
}));

export { getDataMode };

export function getBrokerAdapter(): DataAdapter {
  return {
    id: "broker_execution",
    name: "Broker Execution",
    assetClasses: ["stock", "crypto", "forex"],
    status: "disabled",
    hasApiKey: false,
    description: "DISABLED — real broker execution blocked in compliance mode",
  };
}
