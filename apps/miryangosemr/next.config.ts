import type { NextConfig } from "next";
import path from 'node:path';

// Convert Windows paths to POSIX for Turbopack compatibility
const toPosix = (p: string) => p.split(path.sep).join('/');

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: false },
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
      bodySizeLimit: '50mb',
    },
  },
  transpilePackages: ['react-markdown'],
  turbopack: {
    root: toPosix(path.resolve(__dirname, '../..')),
    resolveAlias: {
      // NOTE: Firebase absolute-path aliases are only in the webpack section below.
      // Turbopack on Windows does not support absolute-path resolve aliases.
      // Shared root src alias
      '@shared': '../../src',
      '@shared/*': '../../src/*',
      // Root-only directories (not present in EMR src/)
      '@/data': '../../src/data',
      '@/data/*': '../../src/data/*',
      '@/hooks': '../../src/hooks',
      '@/hooks/*': '../../src/hooks/*',
      '@/contexts': '../../src/contexts',
      '@/contexts/*': '../../src/contexts/*',
      '@/actions': '../../src/actions',
      '@/actions/*': '../../src/actions/*',
      '@/agents': '../../src/agents',
      '@/agents/*': '../../src/agents/*',
      // Root src lib modules used by shared code (not in EMR)
      '@/lib/audit-logger': '../../src/lib/audit-logger',
      '@/lib/audit-client': '../../src/lib/audit-client',
      '@/lib/firebase-admin': '../../src/lib/firebase-admin',
      '@/lib/firebase-clinical': '../../src/lib/firebase-clinical',
      '@/lib/firebase-public': '../../src/lib/firebase-public',
      '@/lib/workflow-engine': '../../src/lib/workflow-engine',
      '@/lib/digital-signature': '../../src/lib/digital-signature',
      '@/lib/signature-client': '../../src/lib/signature-client',
      '@/lib/fhir': '../../src/lib/fhir',
      '@/lib/fhir/*': '../../src/lib/fhir/*',
      '@/lib/hira': '../../src/lib/hira',
      '@/lib/hira/*': '../../src/lib/hira/*',
      '@/lib/backup': '../../src/lib/backup',
      '@/lib/backup/*': '../../src/lib/backup/*',
      '@/lib/kcd-search-v2': '../../src/lib/kcd-search-v2',
      '@/lib/body-parts': '../../src/lib/body-parts',
      '@/lib/crypto': '../../src/lib/crypto',
      '@/lib/diagnosis-context-suggest': '../../src/lib/diagnosis-context-suggest',
      '@/lib/medical': '../../src/lib/medical',
      '@/lib/medical/*': '../../src/lib/medical/*',
      '@/lib/voice': '../../src/lib/voice',
      '@/lib/voice/*': '../../src/lib/voice/*',
      '@/lib/language-context': '../../src/lib/language-context',
      '@/lib/performance-utils': '../../src/lib/performance-utils',
      '@/lib/noterang': '../../src/lib/noterang',
      '@/lib/pptx-parser': '../../src/lib/pptx-parser',
      '@/lib/image-processor': '../../src/lib/image-processor',
      // Root src types used by shared code (not in EMR)
      '@/types/fhir': '../../src/types/fhir',
      '@/types/fhir/*': '../../src/types/fhir/*',
      '@/types/hira': '../../src/types/hira',
      '@/types/backup': '../../src/types/backup',
      '@/types/security': '../../src/types/security',
      '@/types/clinical': '../../src/types/clinical',
      '@/types/clinical-master': '../../src/types/clinical-master',
      '@/types/public-schemas': '../../src/types/public-schemas',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force ALL firebase SDK imports to resolve from EMR's node_modules (single instance)
      config.resolve.alias = {
        ...config.resolve.alias,
        'firebase/app': path.resolve(__dirname, 'node_modules/firebase/app'),
        'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth'),
        'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/firestore'),
        'firebase/storage': path.resolve(__dirname, 'node_modules/firebase/storage'),
        '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app'),
        '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth'),
        '@firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore'),
        '@firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage'),
        '@firebase/component': path.resolve(__dirname, 'node_modules/@firebase/component'),
        '@firebase/util': path.resolve(__dirname, 'node_modules/@firebase/util'),
        '@firebase/logger': path.resolve(__dirname, 'node_modules/@firebase/logger'),
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: process.env.NODE_ENV === "development"
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com; connect-src 'self' http: https: ws: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com;"
              : "default-src 'self'; script-src 'self' https://apis.google.com https://www.googleapis.com https://www.google.com https://*.firebaseapp.com; img-src 'self' data: https://firebasestorage.googleapis.com https://*.googleusercontent.com; connect-src 'self' https: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com;",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
