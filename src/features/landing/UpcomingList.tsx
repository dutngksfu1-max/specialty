import { UPCOMING_ASSESSMENTS } from "@/lib/siteCopy";

/**
 * 준비 중인 검사 (PRD F-1.6, DEC-026 초안)
 *
 * 링크도 버튼도 아니므로 `aria-disabled`를 붙이지 않습니다.
 * 비활성화할 대상이 없고 `li`에 지원되지 않는 속성이기도 합니다.
 * "준비 중"이라는 사실은 배지 텍스트로 전달합니다 (색만으로 알리지 않기).
 */
export function UpcomingList() {
  return (
    <section className="py-12">
      <h2 className="text-h2 text-foreground sm:text-h2-lg">준비 중인 검사</h2>
      <p className="mt-2 text-body-sm text-foreground-muted">
        아래 검사들은 차례로 추가될 예정이에요.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING_ASSESSMENTS.map((item) => (
          <li key={item.title} className="rounded-md border border-border bg-surface-muted p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-h3 text-foreground-muted">{item.title}</h3>
              <span className="shrink-0 rounded-xs border border-border-strong px-2 py-0.5 text-caption text-foreground-subtle">
                준비 중
              </span>
            </div>
            <p className="mt-2 text-body-sm text-foreground-muted">{item.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
