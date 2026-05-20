import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis diperlukan di server-side saja, jangan di-bundle oleh webpack
  serverExternalPackages: ["googleapis"],
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
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
