import { ActiveAssessmentCard } from "@/features/landing/ActiveAssessmentCard";
import { FaqAccordion } from "@/features/landing/FaqAccordion";
import { Hero } from "@/features/landing/Hero";
import { NicknameEntry } from "@/features/landing/NicknameEntry";
import { UpcomingList } from "@/features/landing/UpcomingList";
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

      <main id="main" className="mx-auto max-w-(--container-landing) px-5 sm:px-6">
        <Hero />
        <NicknameEntry />

        <div className="flex flex-col gap-6 py-12">
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
            <section className="rounded-lg border border-border bg-surface p-6 sm:p-8">
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

        <UpcomingList />
        <FaqAccordion />
      </main>

      <SiteFooter />
    </>
  );
}
