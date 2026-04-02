import Link from "next/link";
import Image from "next/image";
import { WhatsAppButton } from "./whatsapp-button";

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-gray-100">
      <WhatsAppButton />
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image src="/fiq-logo.png?v=2" alt="First in Queue" width={200} height={200} className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-gray-900">First in Queue</span>
            </Link>
            <p className="text-sm text-gray-500">Automated WhatsApp &amp; voice customer care for businesses. Nobody waits. Everyone&apos;s first.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/how-it-works" className="hover:text-gray-900 transition-colors">How It Works</Link></li>
              <li><Link href="/industries" className="hover:text-gray-900 transition-colors">Industries</Link></li>
              <li><Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/how-it-works" className="hover:text-gray-900 transition-colors">Getting Started</Link></li>
              <li><Link href="/contact" className="hover:text-gray-900 transition-colors">Contact Us</Link></li>
              <li><Link href="/pricing#faq" className="hover:text-gray-900 transition-colors">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-gray-900 transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} First in Queue. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-2 md:mt-0">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-gray-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
