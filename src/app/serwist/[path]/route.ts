import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Service Worker 파일을 내려보내는 라우트 (@serwist/turbopack 방식)
 *
 * Turbopack에는 아직 빌드 플러그인이 없어서, Serwist가 Route Handler로 SW를 만들어 줍니다.
 * `/serwist/sw.js`로 서빙되고, `Service-Worker-Allowed: /` 헤더 덕분에
 * 사이트 전체(`scope: "/"`)를 담당할 수 있습니다.
 *
 * `dynamicParams: false`라서 목록에 없는 경로는 그대로 404가 됩니다.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    /**
     * 번들러 선택은 Serwist의 기본값(윈도우=네이티브 esbuild, 그 외=esbuild-wasm)을 따릅니다.
     * esbuild-wasm은 가상 파일시스템을 쓰기 때문에 `C:\...` 같은 윈도우 경로를 받지 못합니다.
     * 그래서 두 패키지를 모두 설치해 두고, 실행되는 OS에 맞는 쪽이 쓰이게 둡니다.
     */
  });
