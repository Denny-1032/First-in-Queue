import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { DialogProvider } from "@/components/ui/dialogs";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { FiqWidgetLoader } from "@/components/landing/fiq-widget-loader";
import { DemoBookingDialog } from "@/components/landing/demo-booking-dialog";
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

// Headlines only. Geist is a good reading face but a quiet one - at 60px it
// recedes instead of landing. Bricolage is a variable grotesque with much more
// character in the display sizes, while staying plain enough not to fight the
// body text underneath it.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "First in Queue - Free Customer Care for Your Business",
    template: "%s | First in Queue",
  },
  description:
    "Never miss another customer message. A free chat widget answers your website visitors 24/7, in 40+ languages. Add WhatsApp and phone when you're ready. No code required.",
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
    title: "First in Queue - WhatsApp & Voice Customer Care",
    description:
      "Automate WhatsApp messages and phone calls. Instant responses, 24/7, in 40+ languages. No code required.",
    images: [
      {
        url: `${BASE_URL}/fiq-logo.png`,
        width: 1200,
        height: 630,
        alt: "First in Queue - customer care that never sleeps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "First in Queue - WhatsApp & Voice Customer Care",
    description:
      "Automate WhatsApp and phone support. 24/7, 40+ languages, 5-minute setup.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ToastProvider>
          <DialogProvider>
            {children}
            <FiqWidgetLoader />
            {/* Every "Book a Demo" CTA across the marketing pages opens this
                one instance; it renders nothing until something does. */}
            <DemoBookingDialog />
          </DialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
