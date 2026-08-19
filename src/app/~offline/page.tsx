import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { SiteHeader } from "@/features/shared/SiteHeader";

export const metadata: Metadata = {
  title: "오프라인",
  robots: { index: false, follow: false },
};

/**
 * 오프라인 안내 (PRD F-7.4)
 *
 * 아직 한 번도 열지 않은 화면을 오프라인에서 요청했을 때 Service Worker가 대신 보여 줍니다.
 * 이미 열어 둔 검사 화면은 캐시에서 그대로 열리므로 여기로 오지 않습니다.
 */
export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-20 sm:px-6">
        <h1 className="text-h1 text-foreground sm:text-h1-lg">인터넷 연결이 끊겼어요</h1>

        <p className="mt-4 max-w-prose text-body text-foreground-muted">
          이 화면은 아직 받아 두지 않아서 지금은 열 수 없어요. 연결이 돌아오면 다시 열립니다.
        </p>

        <div className="mt-8 rounded-md border border-border bg-surface p-5">
          <h2 className="text-h3 text-foreground">진행 중이던 검사는 괜찮아요</h2>
          <p className="mt-2 max-w-prose text-body-sm text-foreground-muted">
            답한 내용은 이 브라우저 안에 저장되어 있어서 사라지지 않습니다. 이미 열어 둔 검사
            화면이라면 연결이 없어도 끝까지 진행할 수 있어요.
          </p>
        </div>

        <Link href="/" className={buttonClasses("primary", "md", "mt-8")}>
          처음으로
        </Link>
      </main>
    </>
  );
}
