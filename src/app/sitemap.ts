import type { MetadataRoute } from "next";

import { StaticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { SITE_URL } from "@/lib/siteCopy";

/**
 * 사이트맵 (Phase 6)
 *
 * 검사 목록을 **카탈로그에서 읽습니다.** 주소를 손으로 적어 두면
 * 검사를 추가할 때 여기도 고쳐야 하고, 고치는 걸 잊습니다 (AGENTS.md 7절).
 *
 * 진행·결과 화면은 넣지 않습니다 — `robots.ts`에서 색인을 막은 경로입니다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const catalog = new StaticAssessmentCatalog();

  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...catalog.listPublished().map((definition) => ({
      url: `${SITE_URL}/assessments/${definition.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
