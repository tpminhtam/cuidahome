import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds the GitHub Pages preview (static UI + bundled sample
// data; AI features gracefully degrade). Normal builds/dev are unaffected.
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export" as const,
        basePath: "/cuidahome",
        trailingSlash: true,
        env: { NEXT_PUBLIC_BASE_PATH: "/cuidahome" },
      }
    : {}),
};

export default nextConfig;
