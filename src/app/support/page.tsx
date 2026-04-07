import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Support - First in Queue",
  description: "Get help with First in Queue. Visit our contact page for support options.",
};

export default function SupportPage() {
  redirect("/contact");
}
