import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/siteCopy";

/**
 * 검색엔진 안내 (Phase 6)
 *
 * 검사 진행 화면과 결과 화면은 **색인하지 않습니다.**
 *   - 결과는 그 사람의 응답에서 나온 개인적인 내용입니다
 *   - 서버에 저장된 것이 아니라 브라우저에만 있으므로, 크롤러가 방문해도 빈 화면입니다
 *     (색인해 봐야 검색 결과에 빈 페이지만 남습니다)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/assessments/*/run", "/assessments/*/result"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
