import { AlertsClient } from "@/components/alerts-client";

export default function AlertsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <p className="mt-1 text-sm text-zinc-500">Dashboard · Email-ready · WhatsApp-ready structure</p>
      <div className="mt-8">
        <AlertsClient />
      </div>
    </div>
  );
}
