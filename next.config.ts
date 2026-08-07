import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  images: {
    localPatterns: [
      {
        pathname: "/**",
        search: "?v=2",
      },
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
    {
      // Everything EXCEPT /widget/* is never framed. The widget documents
      // (/widget/chat, and the legacy voice /widget/iframe) are meant to be
      // framed by customer sites, so DENY here would make the product
      // unusable — see docs/phase1-spec-widget-and-onboarding.md §6.
      // Their framing is controlled per-property by the
      // `Content-Security-Policy: frame-ancestors` header set in middleware.ts.
      source: "/((?!widget/).*)",
      headers: [{ key: "X-Frame-Options", value: "DENY" }],
    },
    {
      source: "/fiq-logo.png",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
