import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";
import { StructuredData } from "./structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "밀양 정형외과 | Miryang Orthopedic Surgery",
    template: "%s | 밀양 정형외과"
  },
  description: "밀양시 최고의 정형외과 진료 서비스. 척추, 관절, 스포츠 손상 전문 진료. 최신 의료 장비와 경험 풍부한 전문의가 함께합니다.",
  keywords: ["밀양 정형외과", "척추 클리닉", "관절 클리닉", "스포츠 손상", "정형외과 전문의", "밀양 병원", "Miryang Orthopedic"],
  authors: [{ name: "밀양 정형외과" }],
  creator: "밀양 정형외과",
  publisher: "밀양 정형외과",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "밀양 정형외과 | Miryang Orthopedic Surgery",
    description: "밀양시 최고의 정형외과 진료 서비스. 척추, 관절, 스포츠 손상 전문 진료.",
    url: "/",
    siteName: "밀양 정형외과",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "밀양 정형외과"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "밀양 정형외과 | Miryang Orthopedic Surgery",
    description: "밀양시 최고의 정형외과 진료 서비스",
    images: ["/images/og-image.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Google Search Console에서 발급받은 코드로 교체
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
