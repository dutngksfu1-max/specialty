import type { Metadata, Viewport } from "next";

import { pretendard } from "@/app/fonts";
import { AssessmentRepositoryProvider } from "@/features/shared/AssessmentRepositoryProvider";
import { ConnectionNotices } from "@/features/shared/ConnectionNotices";
import { ServiceWorkerProvider } from "@/features/shared/ServiceWorkerProvider";
import { BRAND_NAME, SITE_URL } from "@/lib/siteCopy";

import "./globals.css";

export const metadata: Metadata = {
  // 절대 URL의 기준점입니다. 없으면 OG 이미지가 상대 경로로 나가
  // 카카오톡·슬랙 미리보기가 깨집니다 (DEC-022).
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: BRAND_NAME,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "교직 성향과 업무 스타일을 탐색하는 교사용 검사입니다. 가입 없이 브라우저에서 바로 참여할 수 있어요.",
  applicationName: BRAND_NAME,
  // iOS에서 홈 화면에 추가했을 때 앱처럼 열리게 합니다 (PRD F-7.1)
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "default",
  },
  // 전화번호처럼 보이는 숫자(40문항, 10분 등)를 iOS가 링크로 바꾸지 않게 합니다.
  formatDetection: { telephone: false },
  openGraph: {
    title: BRAND_NAME,
    description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
    siteName: BRAND_NAME,
    url: "/",
    locale: "ko_KR",
    type: "website",
  },
  // 개인 결과는 공유 링크로 나가지 않습니다 (DEC-013). 카드는 서비스 소개만 담습니다.
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#5c7a68",
  width: "device-width",
  initialScale: 1,
  // 확대를 막지 않습니다 — 200% 확대해도 내용이 보여야 합니다 (design.md 15)
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={pretendard.variable}>
      {/* 페이지 배경은 globals.css의 --gradient-page가 담당합니다. */}
      <body className="min-h-dvh text-foreground-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-foreground"
        >
          본문 바로가기
        </a>

        <ServiceWorkerProvider>
          <ConnectionNotices />
          <AssessmentRepositoryProvider>{children}</AssessmentRepositoryProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
