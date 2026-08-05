import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChaebolMap — 한국 대기업 소유지분도",
  description:
    "삼성, SK, 현대자동차, LG, 롯데 등 한국 대기업 그룹의 소유지분 구조를 인터랙티브하게 탐색하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
