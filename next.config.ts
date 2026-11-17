import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.run.app",
    "*.europe-west2.run.app",
    "localhost",
    "127.0.0.1",
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
