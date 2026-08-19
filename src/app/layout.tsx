import type { Metadata, Viewport } from "next";

import { pretendard } from "@/app/fonts";
import { AssessmentRepositoryProvider } from "@/features/shared/AssessmentRepositoryProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "서치티쳐마인드",
    template: "%s · 서치티쳐마인드",
  },
  description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사입니다. 가입 없이 브라우저에서 바로 참여할 수 있어요.",
  applicationName: "서치티쳐마인드",
  openGraph: {
    title: "서치티쳐마인드",
    description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
    locale: "ko_KR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#5c7a68",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-dvh bg-background text-foreground-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-foreground"
        >
          본문 바로가기
        </a>
        <AssessmentRepositoryProvider>{children}</AssessmentRepositoryProvider>
      </body>
    </html>
  );
}
