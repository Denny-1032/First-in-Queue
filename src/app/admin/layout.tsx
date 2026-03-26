import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <AdminSidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="w-full p-4 pt-16 lg:p-6 lg:pt-6 xl:p-8 xl:pt-8">{children}</div>
      </main>
    </div>
  );
}
