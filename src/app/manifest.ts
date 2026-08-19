import type { MetadataRoute } from "next";

import { BRAND_NAME } from "@/lib/siteCopy";

/**
 * PWA manifest (docs/architecture.md 9.4, PRD F-7.1)
 *
 * 이름·설명·아이콘 어디에도 기존 성격유형 검사의 명칭이나 4글자 코드를 넣지 않습니다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfcf9", // --sand-50 근사값
    theme_color: "#5c7a68", // --sage-600 근사값
    orientation: "portrait",
    lang: "ko",
    dir: "ltr",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
