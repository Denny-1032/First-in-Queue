"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { WebCallWidget } from "@/components/voice/web-call-widget";

export function DashboardSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200 group"
          title="Talk to FiQ Support"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Need Help?</span>
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      )}

      {/* Support Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-12 right-0 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
            >
              <span>Close</span>
              <X className="h-5 w-5" />
            </button>
            <WebCallWidget
              agentId=""
              greeting="Talk to FiQ Support — ask about features, billing, setup, or anything else."
            />
          </div>
        </div>
      )}
    </>
  );
}
