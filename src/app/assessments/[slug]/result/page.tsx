import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentTheme } from "@/components/ui/AssessmentTheme";
import { ResultView } from "@/features/result/ResultView";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

export const metadata: Metadata = {
  title: "검사 결과",
  robots: { index: false, follow: false },
};

/**
 * 결과 화면 (PRD F-5)
 *
 * 페이지 골격만 Server Component입니다.
 * 결과 데이터는 브라우저 안에만 있으므로 본문은 Client Component(ResultView)가 그립니다.
 */
export default async function ResultPage({ params }: PageProps<"/assessments/[slug]/result">) {
  const { slug } = await params;

  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) notFound();
  const presentation = staticAssessmentCatalog.findPresentationBySlug(found.value.slug);

  return (
    <AssessmentTheme presentation={presentation}>
      <SiteHeader />
      <ResultView slug={found.value.slug} presentation={presentation} />
      <SiteFooter />
    </AssessmentTheme>
  );
}
