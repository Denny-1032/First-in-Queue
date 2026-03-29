import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { MobileNav } from "./mobile-nav";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-9 w-9 object-contain" priority />
          <span className="text-xl font-bold text-gray-900">First in Queue</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</Link>
          <Link href="/industries" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Industries</Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            Start Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <MobileNav />
      </div>
    </nav>
  );
}
