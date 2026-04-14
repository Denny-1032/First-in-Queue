import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardSupportWidget } from "@/components/dashboard/support-widget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="w-full p-4 pt-16 lg:p-6 lg:pt-6 xl:p-8 xl:pt-8">{children}</div>
      </main>
      <DashboardSupportWidget />
    </div>
  );
}
