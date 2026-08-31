import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";

/**
 * 연속 축 점수를 중앙 0 기준의 발산 막대로 보여 줍니다.
 *
 * `score.intensityBandId`는 저장 시점의 낡은 값일 수 있어 읽지 않습니다.
 * 호출부가 `resolveResultNarrative`에서 다시 계산된 구간 id를 넘겨야 합니다.
 */

export type AxisBarVariant = "screen" | "share";

export const AXIS_DISPLAY_LEVEL_MAX = 5;

const SIZE = {
  screen: { track: 12, marker: 20, labelPx: 14, badgePx: 13, gapPx: 12 },
  share: { track: 12, marker: 24, labelPx: 21, badgePx: 18, gapPx: 14 },
} as const;

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

/** Display-only level. Scoring and intensity bands keep using the raw score. */
export function axisDisplayLevel(
  score: Pick<AxisScore, "rawScore" | "minScore" | "maxScore" | "direction">,
): number {
  const direction = score.direction === "positive" ? 1 : -1;
  // 합계가 같아도 동점 보정 또는 콘텐츠 기본값이 정한 방향으로 최소 한 칸을 표시합니다.
  if (score.rawScore === 0) return direction;

  const extent = direction > 0 ? score.maxScore : Math.abs(score.minScore);
  if (extent <= 0) return direction;

  const strength = Math.min(Math.abs(score.rawScore) / extent, 1);
  const level = Math.max(1, Math.ceil(strength * AXIS_DISPLAY_LEVEL_MAX));
  return direction * level;
}

export function visualMarkerPercent(
  score: Pick<AxisScore, "rawScore" | "minScore" | "maxScore" | "direction">,
): number {
  const level = axisDisplayLevel(score);
  return clampPercent(50 + (level / AXIS_DISPLAY_LEVEL_MAX) * 50);
}

export function AxisBar({
  axis,
  score,
  intensityBandId,
  variant = "screen",
}: {
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
  /** 읽는 시점에 rawScore로 다시 계산한 구간 id */
  readonly intensityBandId?: string;
  readonly variant?: AxisBarVariant;
}) {
  const size = SIZE[variant];
  const band = axis.intensityBands.find((candidate) => candidate.id === intensityBandId);
  const displayLevel = axisDisplayLevel(score);
  const markerPercent = visualMarkerPercent(score);
  // 방향은 언제나 한쪽입니다 (DEC-068). 게이지는 '어느 쪽으로 얼마나'만 말합니다.
  const directionLabel =
    score.direction === "positive" ? axis.positive.label : axis.negative.label;
  const shortDirectionLabel =
    score.direction === "positive" ? axis.positive.shortLabel : axis.negative.shortLabel;
  const summaryLabel = `${shortDirectionLabel} · ${band?.label ?? "기울기"}`;

  const fillLeft = score.direction === "negative" ? markerPercent : 50;
  const fillWidth = Math.abs(markerPercent - 50);

  return (
    <div
      style={{ paddingBlock: variant === "share" ? size.gapPx : undefined }}
      className="min-w-0"
    >
      <div
        className={
          variant === "screen"
            ? "grid h-10 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2"
            : "flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2"
        }
      >
        <p
          style={{ fontSize: size.labelPx, color: "var(--color-foreground)" }}
          className="result-axis-name min-w-0 font-semibold"
        >
          {axis.name}
        </p>
        <span
          style={{
            fontSize: size.badgePx,
            paddingInline: variant === "share" ? 12 : 8,
            paddingBlock: variant === "share" ? 4 : 3,
          }}
          className="result-axis-score-badge shrink-0 rounded-xs border border-border-strong bg-surface-muted font-semibold tabular-nums text-foreground-body"
        >
          {summaryLabel}
        </span>
      </div>

      <div
        style={{ marginTop: size.gapPx }}
        className={`flex items-end justify-between gap-4 ${variant === "screen" ? "h-11" : ""}`}
      >
        <span
          style={{ fontSize: size.labelPx }}
          className="max-w-[46%] font-semibold text-chart-negative"
        >
          {axis.negative.label}
        </span>
        <span
          style={{ fontSize: size.labelPx }}
          className="max-w-[46%] text-right font-semibold text-chart-positive"
        >
          {axis.positive.label}
        </span>
      </div>

      <div
        style={{ marginTop: size.gapPx, height: size.track }}
        className="result-axis-track relative w-full rounded-full"
        role="img"
        aria-label={`${axis.name}: ${directionLabel} 쪽, ${
          band?.label ?? "기울기"
        }, 5단계 중 ${Math.abs(displayLevel)}단계`}
      >
        {fillWidth > 0 && (
          <span
            aria-hidden="true"
            data-direction={score.direction}
            className="result-axis-fill absolute inset-y-0"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
        )}

        <span
          aria-hidden="true"
          className="result-axis-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />
        <span
          aria-hidden="true"
          data-direction={score.direction}
          style={{
            left: `${markerPercent}%`,
            width: size.marker,
            height: size.marker,
            borderWidth: variant === "share" ? 3 : 2,
          }}
          className="result-axis-marker absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border-solid border-surface"
        />
      </div>
    </div>
  );
}
