/// <reference lib="webworker" />
// ↑ 이 파일만 Service Worker 환경 타입(ServiceWorkerGlobalScope 등)을 씁니다.

import { defaultCache } from "@serwist/turbopack/worker";
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

/**
 * Service Worker (docs/architecture.md 9장, DEC-007)
 *
 * 목표는 세 가지입니다.
 *   1. 설치 가능하게 만든다
 *   2. 검사 도중 네트워크가 끊겨도 응답이 유지된다  ← 이건 IndexedDB가 담당
 *   3. 이미 연 검사는 오프라인에서도 끝까지 진행된다 ← 이걸 여기서 담당
 *
 * **사용자 응답은 절대 캐시하지 않습니다.** 원본은 IndexedDB이고,
 * 네트워크로 나가는 응답 데이터 자체가 없습니다.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,

  /**
   * skipWaiting: false — **검사 도중 자동 갱신 금지** (architecture 9.5)
   *
   * 새 버전이 배포됐다고 바로 갈아치우면 40문항을 풀던 사람의 화면이 새로고침되어
   * 진행이 끊길 수 있습니다. 새 버전은 대기시키고, 사용자가 검사를 마친 뒤
   * 화면 안내를 눌러 직접 갱신하게 합니다.
   */
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: defaultCache,

  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
