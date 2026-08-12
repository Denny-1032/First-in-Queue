import type { MetadataRoute } from "next";
import { DEMO_PATHS } from "@/lib/demo/decks";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://firstinqueue.com";

export default function robots(): MetadataRoute.Robots {
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
          // Proposal demos carry a prospect's name. They are unlisted by design
          // - see src/lib/demo/decks.ts. The pages also send their own noindex;
          // this is the belt to that pair of braces. Listed per deck because
          // each one now sits at a top-level path of its own.
          ...DEMO_PATHS,
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
