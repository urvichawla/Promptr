import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  compress: false,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
