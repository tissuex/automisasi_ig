import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan gambar dari domain external (Instagram CDN, dll)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
  },
};

export default nextConfig;
