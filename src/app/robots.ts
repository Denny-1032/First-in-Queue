import type { MetadataRoute } from "next";

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
