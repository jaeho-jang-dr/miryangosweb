import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.kakaocdn.net',
      },
    ],
    // WebP/AVIF 자동 변환으로 이미지 크기 절감
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // lucide-react, framer-motion 등 트리쉐이킹 최적화
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'framer-motion',
      'date-fns',
    ],
  },
  transpilePackages: ['react-markdown'],
  // Node.js 전용 서버 패키지 외부화 (번들 크기 감소)
  serverExternalPackages: ['pdf-parse', 'pdf2pic', 'gm', 'mammoth'],
  // 프로덕션 빌드 시 console.log 제거 (성능 개선 + 정보 누출 방지)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: process.env.NODE_ENV === "development"
              // 개발 환경: unsafe-eval 허용 (HMR/Fast Refresh 필요), CDN tailwind 제거
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com https://*.kakao.com https://*.kakaocdn.net https://static.nid.naver.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://images.unsplash.com https://*.googleusercontent.com https://grainy-gradients.vercel.app https://*.kakaocdn.net; connect-src 'self' http: https: ws: wss: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://firestore.googleapis.com https://*.kakao.com https://nid.naver.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://maps.google.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com https://*.kakao.com https://nid.naver.com; media-src 'self' blob:; worker-src 'self' blob:;"
              // 프로덕션: CDN tailwind 제거, blob: img-src 추가 (음성녹음 미리보기), wss: 추가
              : "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com https://*.kakao.com https://*.kakaocdn.net https://static.nid.naver.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://images.unsplash.com https://*.googleusercontent.com https://grainy-gradients.vercel.app https://*.kakaocdn.net; connect-src 'self' https: wss: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://firestore.googleapis.com https://*.kakao.com https://nid.naver.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://maps.google.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com https://*.kakao.com https://nid.naver.com; media-src 'self' blob:; worker-src 'self' blob:;",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=(), payment=()",
          },
        ],
      },
      // /images/ 경로의 정적 자산 장기 캐시
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
