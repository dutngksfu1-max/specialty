import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { AssessmentMenu } from "@/features/assessment-runner/AssessmentMenu";

export type SaveState = "loading" | "saving" | "saved" | "error";

function SaveStatus({ state }: { readonly state: SaveState }) {
  const copy = {
    loading: "응답 불러오는 중…",
    saving: "저장 중…",
    saved: "이 브라우저에 저장됨",
    error: "저장하지 못했어요",
  }[state];

  return (
    <span
      className={`flex items-center gap-1.5 text-caption ${state === "error" ? "text-status-danger" : "text-foreground-subtle"}`}
      aria-live="polite"
    >
      <Icon name={state === "error" ? "warning" : state === "saved" ? "check" : "device"} className="size-4" />
      {copy}
    </span>
  );
}

export function AssessmentProgress({
  slug,
  sectionOrder,
  sectionCount,
  answeredCount,
  totalCount,
  saveState,
  menuDisabled,
  onPause,
  onHome,
  onRestart,
}: {
  readonly slug: string;
  readonly sectionOrder: number;
  readonly sectionCount: number;
  readonly answeredCount: number;
  readonly totalCount: number;
  readonly saveState: SaveState;
  readonly menuDisabled: boolean;
  readonly onPause: () => Promise<boolean>;
  readonly onHome: () => Promise<boolean>;
  readonly onRestart: () => Promise<boolean>;
}) {
  const percent = totalCount === 0 ? 0 : (answeredCount / totalCount) * 100;

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-(--container-survey) px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/assessments/${slug}`} className="inline-flex min-h-11 items-center gap-1 text-caption text-foreground-muted underline-offset-4 hover:text-primary-active hover:underline">
              <Icon name="arrow-left" className="size-4" /> 검사 안내
            </Link>
            <p className="truncate text-label text-foreground">
              묶음 <span className="tabular-nums">{sectionOrder} / {sectionCount}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="text-right text-label tabular-nums text-foreground" aria-label={`전체 ${totalCount}문항 중 ${answeredCount}문항 응답`}>
              {answeredCount}<span className="font-normal text-foreground-subtle"> / {totalCount}</span>
            </p>
            <AssessmentMenu disabled={menuDisabled} onPause={onPause} onHome={onHome} onRestart={onRestart} />
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="검사 진행률"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuetext={`전체 ${totalCount}문항 중 ${answeredCount}문항 응답`}
          className="mt-3 grid h-1.5 gap-1"
          style={{ gridTemplateColumns: `repeat(${sectionCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: sectionCount }, (_, index) => {
            const segmentStart = (index / sectionCount) * 100;
            const segmentFill = Math.max(0, Math.min(100, (percent - segmentStart) * sectionCount));
            return (
              <span key={index} className="overflow-hidden rounded-full bg-surface-inset">
                <span className="block h-full rounded-full bg-primary transition-[width] duration-(--motion-base) ease-out-soft" style={{ width: `${segmentFill}%` }} />
              </span>
            );
          })}
        </div>

        <div className="mt-2 flex justify-end"><SaveStatus state={saveState} /></div>
      </div>
    </header>
  );
}
