import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increase limit for file uploads
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: process.env.NODE_ENV === "development"
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://images.unsplash.com https://*.googleusercontent.com; connect-src 'self' http: https: ws: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://maps.google.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com;"
              : "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com; img-src 'self' data: https://firebasestorage.googleapis.com https://images.unsplash.com https://*.googleusercontent.com; connect-src 'self' https: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://maps.google.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
