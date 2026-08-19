"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

/**
 * 오프라인 배너 + 새 버전 안내 (PRD F-7.5, docs/architecture.md 9.5)
 *
 * 둘 다 **화면을 가리지 않는 인라인 안내**입니다. Modal이나 Toast를 쓰지 않습니다.
 * 특히 새 버전은 **자동으로 갱신하지 않습니다** — 검사 도중 새로고침되면 흐름이 끊기므로,
 * 사용자가 직접 누를 때만 갱신합니다.
 */
export function ConnectionNotices() {
  const { serwist } = useSerwist();

  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // navigator.onLine은 "랜선이 꽂혀 있는가"에 가까워서 완벽하지는 않지만,
    // 강의실 와이파이가 끊기는 상황을 알리는 데는 충분합니다.
    const sync = () => setOffline(!navigator.onLine);
    sync();

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (serwist === null) return;

    const onWaiting = () => setUpdateReady(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  function applyUpdate() {
    if (serwist === null) return;
    // 새 Service Worker가 자리를 잡으면 페이지를 다시 불러옵니다.
    serwist.addEventListener("controlling", () => window.location.reload());
    void serwist.messageSkipWaiting();
  }

  if (!offline && !updateReady) return null;

  return (
    <div className="mx-auto max-w-(--container-landing) px-5 pt-3 sm:px-6">
      {offline && (
        <p
          role="status"
          className="rounded-md border border-border bg-surface-muted px-4 py-3 text-body-sm text-foreground-body"
        >
          <span aria-hidden="true">⚠ </span>
          인터넷 연결이 끊겼어요. <strong className="font-semibold">이미 시작한 검사는 그대로 진행할 수 있고</strong>,
          답한 내용도 이 브라우저에 저장돼요.
        </p>
      )}

      {updateReady && (
        <div
          role="status"
          className="mt-2 flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-body-sm text-foreground-body">
            <span aria-hidden="true">ℹ </span>
            새 버전이 준비됐어요. <strong className="font-semibold">검사를 마친 뒤</strong> 새로고침해 주세요.
          </p>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={applyUpdate}>
            지금 새로고침
          </Button>
        </div>
      )}
    </div>
  );
}
