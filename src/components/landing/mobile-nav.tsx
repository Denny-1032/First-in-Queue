"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute top-16 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
            <div className="flex flex-col p-4 space-y-1">
              <a
                href="#features"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#industries"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Industries
              </a>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Pricing
              </a>
              <hr className="my-2 border-gray-100" />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mx-4 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-medium text-white"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
