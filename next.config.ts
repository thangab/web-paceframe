import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "startupfa.me",
      },
    ],
  },
};

export default nextConfig;
