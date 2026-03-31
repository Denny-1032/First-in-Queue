import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "First in Queue — AI WhatsApp Customer Care",
    template: "%s | First in Queue",
  },
  description: "AI-powered WhatsApp & voice support for Zambian businesses. Instant responses, 40+ languages, 24/7. Start your free trial.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com"),
  openGraph: {
    type: "website",
    locale: "en_ZM",
    siteName: "First in Queue",
    title: "First in Queue — AI WhatsApp Customer Care",
    description: "AI-powered WhatsApp support for Zambian businesses. Instant responses, 40+ languages, 24/7.",
  },
  twitter: {
    card: "summary_large_image",
    title: "First in Queue — AI WhatsApp Customer Care",
    description: "AI-powered WhatsApp support for Zambian businesses.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/fiq-logo.png", type: "image/png" },
    ],
    shortcut: "/fiq-logo.png",
    apple: "/fiq-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
