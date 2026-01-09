import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "KCD-8 상병 검색",
  description: "상병명→KCD 코드 검색 및 ASSESSMENT 자동 삽입",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
