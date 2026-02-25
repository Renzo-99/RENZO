import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "목공실 관리 시스템",
  description: "주간업무보고 & 재고관리 통합 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
