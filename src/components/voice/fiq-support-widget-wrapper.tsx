"use client";

import { usePathname } from "next/navigation";
import { FiqSupportWidget } from "./fiq-support-widget";

const HIDDEN_PREFIXES = ["/dashboard", "/login", "/signup", "/widget", "/trial-payment"];

export function FiqSupportWidgetWrapper() {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (hidden) return null;
  return <FiqSupportWidget />;
}
