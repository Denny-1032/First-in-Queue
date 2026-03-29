"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MessageSquare,
  BarChart3,
  Settings,
  Users,
  Zap,
  Home,
  Bot,
  Workflow,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/ai-config", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const advancedNavItems = [
  { href: "/dashboard/flows", label: "Flows", icon: Workflow },
  { href: "/dashboard/agents", label: "Team", icon: Users },
  { href: "/dashboard/integrations", label: "Integrations", icon: Zap },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear cookie client-side as fallback
      document.cookie = "fiq-auth=; path=/; max-age=0";
    }
    router.push("/login");
  };

  return (
    <>
    {/* Mobile toggle button */}
    <button
      onClick={() => setMobileOpen(!mobileOpen)}
      className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm"
    >
      {mobileOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
    </button>
    {/* Backdrop for mobile */}
    {mobileOpen && (
      <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
    )}
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white transition-transform lg:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
          <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-8 w-8 object-contain" />
          <div>
            <h1 className="font-bold text-gray-900">First in Queue</h1>
            <p className="text-xs text-gray-500">Nobody waits. Everyone&apos;s first.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Advanced</p>
            {advancedNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-600" : "text-gray-400")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Bot className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">Bot Active</p>
              <p className="text-[10px] text-emerald-600">Responding to chats</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
