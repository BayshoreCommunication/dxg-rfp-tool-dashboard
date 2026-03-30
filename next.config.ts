import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bayshore.nyc3.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
