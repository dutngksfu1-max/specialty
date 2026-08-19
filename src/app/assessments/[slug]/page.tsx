import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Accordion } from "@/components/ui/Accordion";
import { StartAssessmentControls } from "@/features/assessment-runner/StartAssessmentControls";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { StorageNotice } from "@/features/shared/StorageNotice";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { DISCLAIMER, PRIVACY_NOTE } from "@/lib/siteCopy";

export async function generateMetadata({
  params,
}: PageProps<"/assessments/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) return { title: "검사를 찾을 수 없어요" };

  return {
    title: found.value.title,
    description: found.value.summary,
  };
}

/** 검사 소개 (PRD User Flow [2]) — 내용은 Server, 시작 버튼만 Client */
export default async function AssessmentIntroPage({ params }: PageProps<"/assessments/[slug]">) {
  const { slug } = await params;
  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) notFound();

  const definition = found.value;
  const sections = [...definition.sections].sort((a, b) => a.order - b.order);

  return (
    <>
      <SiteHeader />
      <StorageNotice />

      <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-10 sm:px-6">
        <nav className="mb-6 text-body-sm">
          <Link
            href="/"
            className="rounded-sm text-foreground-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            ← 처음으로
          </Link>
        </nav>

        <h1 className="text-h1 text-foreground sm:text-h1-lg">{definition.title}</h1>
        <p className="mt-4 text-body-lg text-foreground-muted">{definition.summary}</p>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-border py-6 text-center">
          <div>
            <dt className="text-caption text-foreground-subtle">문항</dt>
            <dd className="mt-1 text-h3 text-foreground">{definition.questions.length}개</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-subtle">묶음</dt>
            <dd className="mt-1 text-h3 text-foreground">{sections.length}개</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-subtle">예상 시간</dt>
            <dd className="mt-1 text-h3 text-foreground">약 {definition.estimatedMinutes}분</dd>
          </div>
        </dl>

        <p className="mt-8 max-w-prose text-body text-foreground-body">{definition.description}</p>

        <p className="mt-6 max-w-prose text-body-sm text-foreground-muted">
          <span aria-hidden="true">ℹ </span>
          {DISCLAIMER}
        </p>
        <p className="mt-2 max-w-prose text-body-sm text-foreground-muted">
          <span aria-hidden="true">ℹ </span>
          {PRIVACY_NOTE.long}
        </p>

        <StartAssessmentControls slug={definition.slug} />

        <section className="mt-12">
          <h2 className="text-h2 text-foreground">진행 방식</h2>
          <div className="mt-4 border-t border-border">
            <Accordion summary="어떤 순서로 진행되나요?">
              <p className="max-w-prose">
                문항은 {sections.length}개 묶음으로 나뉘어 있고, 한 화면에{" "}
                {Math.round(definition.questions.length / Math.max(sections.length, 1))}문항씩
                나옵니다. 답을 고르면 그 즉시 저장되기 때문에, 중간에 나갔다 와도 이어서 할 수
                있어요.
              </p>
            </Accordion>
            <Accordion summary="답을 고치고 싶으면요?">
              <p className="max-w-prose">
                언제든 다시 누르면 됩니다. 마지막에 고른 답이 저장돼요. 이전 묶음으로 돌아가서
                고쳐도 괜찮습니다.
              </p>
            </Accordion>
            <Accordion summary="모든 문항에 답해야 하나요?">
              <p className="max-w-prose">
                네. 빠진 문항이 있으면 점수가 한쪽으로 치우치기 때문에, 결과를 보려면 모든 문항에
                답해야 해요. 답하지 않은 문항이 있으면 그 자리로 데려다 드립니다.
              </p>
            </Accordion>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
