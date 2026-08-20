import { AssessmentTheme } from "@/components/ui/AssessmentTheme";
import { ActiveAssessmentCard } from "@/features/landing/ActiveAssessmentCard";
import { NicknameEntry } from "@/features/landing/NicknameEntry";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { StorageNotice } from "@/features/shared/StorageNotice";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

export default function HomePage() {
  const published = staticAssessmentCatalog.listPublished();
  const contentBroken = staticAssessmentCatalog.contentErrors.length > 0;
  const featured = published.length === 1 ? published[0] : undefined;
  const featuredPresentation =
    featured === undefined ? undefined : staticAssessmentCatalog.findPresentationBySlug(featured.slug);

  return (
    <AssessmentTheme presentation={featuredPresentation}>
      <SiteHeader />
      <StorageNotice />

      <main id="main" className="mx-auto min-h-[calc(100dvh-9rem)] max-w-(--container-landing) px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <h1 className="sr-only">클래스렌즈 — 교직 성향·업무 스타일 탐색</h1>

        {featured !== undefined ? (
          <>
            <ActiveAssessmentCard
              featured
              assessment={{
                slug: featured.slug,
                title: featured.title,
                summary: featured.summary,
                description: featured.description,
                estimatedMinutes: featured.estimatedMinutes,
                questionCount: featured.questions.length,
                sectionCount: featured.sections.length,
                presentation: featuredPresentation,
              }}
            >
              <NicknameEntry />
            </ActiveAssessmentCard>
          </>
        ) : published.length > 1 ? (
          <>
            <section className="max-w-2xl">
              <p className="text-label text-primary-active">나에게 맞는 탐색을 골라 보세요</p>
              <h2 className="mt-3 text-h1 text-foreground sm:text-h1-lg">오늘은 어떤 교직 장면을 들여다볼까요?</h2>
              <div className="mt-7 max-w-md"><NicknameEntry /></div>
            </section>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
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
                    presentation: staticAssessmentCatalog.findPresentationBySlug(definition.slug),
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <section className="mx-auto max-w-xl border-l-2 border-accent pl-6">
            <h2 className="text-h2 text-foreground">
              {contentBroken ? ERROR_MESSAGES.INVALID_CONTENT_PACKAGE.title : "준비된 검사가 아직 없어요"}
            </h2>
            <p className="mt-3 text-body text-foreground-muted">
              {contentBroken ? ERROR_MESSAGES.INVALID_CONTENT_PACKAGE.body : "곧 첫 검사가 열릴 예정이에요."}
            </p>
          </section>
        )}
      </main>

      <SiteFooter />
    </AssessmentTheme>
  );
}
