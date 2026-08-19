"use client";

import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";

/**
 * IndexedDB를 쓸 수 없을 때(시크릿 모드 등) 띄우는 안내입니다.
 *
 * 이 상태에서는 새로고침하면 응답이 사라지므로, 조용히 넘어가면 안 됩니다.
 * 색만으로 알리지 않고 아이콘과 문장을 함께 씁니다.
 */
export function StorageNotice() {
  const services = useAssessmentServices();
  if (services === null || services.storage === "indexeddb") return null;

  return (
    <div
      role="status"
      className="border-b border-border bg-surface-muted px-5 py-3 text-body-sm text-foreground-body sm:px-6"
    >
      <span aria-hidden="true">⚠ </span>
      이 브라우저에서는 응답을 오래 보관할 수 없어요. 새로고침하면 사라질 수 있으니, 가능하면 시크릿
      모드가 아닌 일반 창에서 진행해 주세요.
    </div>
  );
}
