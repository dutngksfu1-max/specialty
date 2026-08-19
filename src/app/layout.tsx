import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "서치티쳐마인드",
  description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
