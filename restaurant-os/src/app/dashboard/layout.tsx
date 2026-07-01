import { Sidebar } from "@/components/dashboard/sidebar";
import { PermanentStorageBanner } from "@/components/media/permanent-storage-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-4 pt-16 lg:p-6 lg:pt-6">
        <div className="mx-auto max-w-7xl">
          <PermanentStorageBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
