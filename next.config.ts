import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
};

export default nextConfig;
