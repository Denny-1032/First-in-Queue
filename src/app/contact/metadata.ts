import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export const metadata: Metadata = {
  title: "Contact Us — Get Help & Talk to Our Team",
  description:
    "Get in touch with First in Queue. Talk to our AI support agent, email us, or message us on WhatsApp. We respond within minutes.",
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
  openGraph: {
    title: "Contact First in Queue",
    description:
      "Talk to our team via AI agent, email, or WhatsApp. We respond within minutes.",
    url: `${BASE_URL}/contact`,
  },
};
