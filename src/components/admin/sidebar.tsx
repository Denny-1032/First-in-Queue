"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wifi,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/onboarding", label: "Onboarding Queue", icon: ClipboardList },
  { href: "/admin/connections", label: "Connections", icon: Wifi },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      document.cookie = "fiq-admin-auth=; path=/; max-age=0";
    }
    router.push("/admin/login");
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 shadow-sm"
      >
        {mobileOpen ? <X className="h-5 w-5 text-slate-300" /> : <Menu className="h-5 w-5 text-slate-300" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
            <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-8 w-8 object-contain" />
            <div>
              <h1 className="font-bold text-white text-sm">First in Queue</h1>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Shield className="h-2.5 w-2.5" /> Admin Portal
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-400" : "text-slate-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">FiQ Admin</p>
                <p className="text-[10px] text-slate-400">Super Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
