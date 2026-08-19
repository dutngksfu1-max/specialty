import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AssessmentRunner } from "@/features/assessment-runner/AssessmentRunner";
import { StorageNotice } from "@/features/shared/StorageNotice";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

export const metadata: Metadata = {
  title: "검사 진행",
  robots: { index: false, follow: false },
};

/**
 * Part 진행 화면 (PRD F-3, DEC-005)
 *
 * 페이지 골격과 문항 텍스트는 서버에서 만들고,
 * 응답 상태·저장·이동만 Client Component(AssessmentRunner)가 맡습니다.
 */
export default async function RunPartPage({ params }: PageProps<"/assessments/[slug]/run/[part]">) {
  const { slug, part } = await params;

  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) notFound();
  const definition = found.value;

  // 유효하지 않은 Part 번호(0, 5, 문자)는 404로 처리합니다 (DEC-005).
  if (!/^\d+$/.test(part)) notFound();
  const sectionOrder = Number.parseInt(part, 10);

  const sections = [...definition.sections].sort((a, b) => a.order - b.order);
  const index = sections.findIndex((section) => section.order === sectionOrder);
  if (index === -1) notFound();

  const section = sections[index];
  if (section === undefined) notFound();

  const questions = definition.questions
    .filter((question) => question.sectionId === section.id)
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <StorageNotice />
      <Suspense fallback={null}>
        <AssessmentRunner
          slug={definition.slug}
          sectionOrder={section.order}
          sectionCount={sections.length}
          totalCount={definition.questions.length}
          questions={questions}
          options={definition.scale.options}
          previousSectionOrder={index > 0 ? (sections[index - 1]?.order ?? null) : null}
          nextSectionOrder={
            index < sections.length - 1 ? (sections[index + 1]?.order ?? null) : null
          }
        />
      </Suspense>
    </>
  );
}
