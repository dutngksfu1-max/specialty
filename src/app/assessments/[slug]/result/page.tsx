import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultPlaceholder } from "@/features/result/ResultPlaceholder";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

export const metadata: Metadata = {
  title: "검사 결과",
  robots: { index: false, follow: false },
};

/**
 * 결과 화면 — **Phase 3에서 만듭니다.**
 *
 * 지금은 "채점이 끝나고 결과가 저장되었다"는 것만 확인해 주는 자리입니다.
 * 검사를 끝냈는데 갈 곳이 없으면 안 되기 때문에 자리를 먼저 잡아 두었습니다.
 */
export default async function ResultPage({ params }: PageProps<"/assessments/[slug]/result">) {
  const { slug } = await params;

  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) notFound();

  return (
    <>
      <SiteHeader />
      <ResultPlaceholder slug={found.value.slug} />
      <SiteFooter />
    </>
  );
}
