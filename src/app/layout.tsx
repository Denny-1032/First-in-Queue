import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

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
    default: "First in Queue — AI WhatsApp & Voice Customer Care",
    template: "%s | First in Queue",
  },
  description:
    "Never lose a customer to slow responses. First in Queue automates WhatsApp messages and phone calls with AI — 24/7, in 40+ languages. 5-minute setup, no code required.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: BASE_URL,
  },
  keywords: [
    "WhatsApp customer care",
    "WhatsApp business automation",
    "AI customer support",
    "voice AI agent",
    "WhatsApp chatbot",
    "automated customer service",
    "Zambia WhatsApp business",
    "AI phone answering",
    "customer care platform",
    "WhatsApp API",
    "First in Queue",
    "24/7 customer support",
    "multilingual chatbot",
    "small business automation",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZM",
    url: BASE_URL,
    siteName: "First in Queue",
    title: "First in Queue — AI WhatsApp & Voice Customer Care",
    description:
      "Automate WhatsApp messages and phone calls with AI. Instant responses, 24/7, in 40+ languages. No code required.",
    images: [
      {
        url: `${BASE_URL}/fiq-logo.png`,
        width: 1200,
        height: 630,
        alt: "First in Queue — AI-Powered Customer Care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "First in Queue — AI WhatsApp & Voice Customer Care",
    description:
      "Automate WhatsApp and phone support with AI. 24/7, 40+ languages, 5-minute setup.",
    images: [`${BASE_URL}/fiq-logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/fiq-logo.png", type: "image/png" }],
    shortcut: "/fiq-logo.png",
    apple: "/fiq-logo.png",
  },
  category: "technology",
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
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
