import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [90],
    // Cache optimized variants at the edge for 1 year.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
