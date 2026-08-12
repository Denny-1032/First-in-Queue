import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { DEMO_SUBDOMAINS } from "@/lib/demo/decks";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // On a demo subdomain the mock-up is served at the root, so a path Disallow
  // cannot reach it - the whole host has to be closed. Nothing else lives on
  // these hosts, so blanket-denying them costs nothing.
  const host = (await headers()).get("host") ?? "";
  const label = host.split(":")[0].split(".")[0].toLowerCase();
  if (DEMO_SUBDOMAINS[label]) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/login",
          "/invite/",
          "/trial-payment",
          "/widget/",
          // Proposal demos carry a prospect's name and colours. They are
          // unlisted by design - see src/lib/demo/decks.ts. The pages also
          // send their own noindex; this is the belt to that pair of braces.
          "/demo/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
