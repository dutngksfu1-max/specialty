/**
 * 진행 표시 (docs/design.md 10.4, PRD F-3.4)
 *
 * 색과 막대 길이만으로 전달하지 않습니다. `10 / 40` 숫자를 항상 함께 씁니다.
 */
export function AssessmentProgress({
  sectionOrder,
  sectionCount,
  answeredCount,
  totalCount,
}: {
  readonly sectionOrder: number;
  readonly sectionCount: number;
  readonly answeredCount: number;
  readonly totalCount: number;
}) {
  const percent = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-[2px]">
      <div className="mx-auto max-w-(--container-survey) px-5 py-3 sm:px-6">
        <div className="flex items-baseline justify-between text-caption text-foreground-muted">
          <span>
            Part {sectionOrder} / {sectionCount}
          </span>
          <span className="tabular-nums">
            {answeredCount} / {totalCount}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="검사 진행률"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-inset"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[180ms] ease-out-soft"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
