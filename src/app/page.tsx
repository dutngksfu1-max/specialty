import { ActiveAssessmentCard } from "@/features/landing/ActiveAssessmentCard";
import { NicknameEntry } from "@/features/landing/NicknameEntry";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { StorageNotice } from "@/features/shared/StorageNotice";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

/**
 * 랜딩 (PRD F-1)
 *
 * 페이지 골격·Hero·준비 중 검사·FAQ는 Server Component입니다.
 * 브라우저 저장소를 읽어야 하는 부분(닉네임·이어서 하기)만 Client Component입니다.
 */
export default function HomePage() {
  const published = staticAssessmentCatalog.listPublished();
  const contentBroken = staticAssessmentCatalog.contentErrors.length > 0;

  return (
    <>
      <SiteHeader />
      <StorageNotice />

      <main id="main" className="mx-auto px-5 sm:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-8">
        {/*
          페이지마다 h1이 하나 있어야 스크린리더 사용자가 "여기가 어디인지" 알 수 있습니다
          (docs/design.md 15장). 지금 랜딩은 큰 제목 없이 바로 시작하는 구성이라,
          화면에는 보이지 않고 보조기기에만 읽히는 제목을 둡니다.
        */}
        <h1 className="sr-only">서치티쳐마인드 — 교직 성향·업무 스타일 탐색</h1>

        <div className="w-full max-w-2xl bg-surface/80 backdrop-blur-md shadow-elev-3 rounded-3xl p-8 sm:p-12 border-4 border-white/60 flex flex-col items-center text-center">
          <NicknameEntry />

          <div className="w-full flex flex-col gap-6 pt-8 border-t border-border/50">
            {published.map((definition) => (
              <ActiveAssessmentCard
                key={definition.slug}
                assessment={{
                  slug: definition.slug,
                  title: definition.title,
                  summary: definition.summary,
                  description: definition.description,
                  estimatedMinutes: definition.estimatedMinutes,
                  questionCount: definition.questions.length,
                  sectionCount: definition.sections.length,
                }}
              />
            ))}

            {published.length === 0 && (
              <section className="flex flex-col items-center">
                <h2 className="text-h2 text-foreground">
                  {contentBroken
                    ? ERROR_MESSAGES.INVALID_CONTENT_PACKAGE.title
                    : "준비된 검사가 아직 없어요"}
                </h2>
                <p className="mt-2 text-body text-foreground-muted">
                  {contentBroken
                    ? ERROR_MESSAGES.INVALID_CONTENT_PACKAGE.body
                    : "곧 첫 검사가 열릴 예정이에요."}
                </p>
              </section>
            )}
          </div>
        </div>

      </main>

      <SiteFooter />
    </>
  );
}
