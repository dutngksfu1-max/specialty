"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

/**
 * Service Worker 등록 (DEC-007, docs/architecture.md 9장)
 *
 * 두 옵션이 특히 중요합니다.
 *
 * - `reloadOnOnline={false}`
 *   기본값은 true라서, 네트워크가 돌아오면 페이지를 **자동으로 새로고침**합니다.
 *   강의실 와이파이가 끊겼다 붙는 동안 검사 화면이 새로고침되면 흐름이 끊기므로 껐습니다.
 *   응답 자체는 IndexedDB에 있어 사라지지 않지만, 화면이 갑자기 바뀌는 경험은 피합니다.
 *
 * - `cacheOnNavigation`
 *   이동한 페이지를 캐시에 담아 두어, 다음에 오프라인이어도 열립니다.
 */
export function ServiceWorkerProvider({ children }: { readonly children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      register
      cacheOnNavigation
      reloadOnOnline={false}
      options={{ scope: "/" }}
    >
      {children}
    </SerwistProvider>
  );
}
