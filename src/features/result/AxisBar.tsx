import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";

/**
 * 연속 축 점수를 중앙 0 기준의 발산 막대로 보여 줍니다.
 *
 * `score.intensityBandId`는 저장 시점의 낡은 값일 수 있어 읽지 않습니다.
 * 호출부가 `resolveResultNarrative`에서 다시 계산된 구간 id를 넘겨야 합니다.
 */

export type AxisBarVariant = "screen" | "share";

const SIZE = {
  screen: { track: 10, marker: 18, labelPx: 14, badgePx: 13, gapPx: 12 },
  share: { track: 12, marker: 24, labelPx: 21, badgePx: 18, gapPx: 14 },
} as const;

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function signedScore(value: number): string {
  return value > 0 ? `+${value}` : String(value);
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
  const markerPercent = clampPercent(score.normalized * 100);
  const showsDirection = band?.directional ?? !score.isBalanced;
  const isExactCenter = score.rawScore === 0;

  const directionLabel =
    score.direction === "positive" ? axis.positive.label : axis.negative.label;
  const shortDirectionLabel =
    score.direction === "positive" ? axis.positive.shortLabel : axis.negative.shortLabel;
  const summaryLabel = !showsDirection
    ? isExactCenter
      ? (band?.label ?? "균형")
      : `${shortDirectionLabel} · ${band?.label ?? "균형 구간"}`
    : `${shortDirectionLabel} · ${band?.label ?? "방향 확인"}`;

  const fillLeft = score.direction === "negative" ? markerPercent : 50;
  const fillWidth = Math.abs(markerPercent - 50);

  const range = score.maxScore - score.minScore;
  const balancedLeft =
    band !== undefined && !band.directional && range > 0
      ? clampPercent(((-band.maxAbsScore - score.minScore) / range) * 100)
      : 50;
  const balancedRight =
    band !== undefined && !band.directional && range > 0
      ? clampPercent(((band.maxAbsScore - score.minScore) / range) * 100)
      : 50;

  return (
    <div
      style={{ paddingBlock: variant === "share" ? size.gapPx : undefined }}
      className="min-w-0"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p
          style={{ fontSize: size.labelPx, color: "var(--color-foreground)" }}
          className="min-w-0 font-semibold"
        >
          {axis.name}
        </p>
        <span
          style={{
            fontSize: size.badgePx,
            paddingInline: variant === "share" ? 12 : 8,
            paddingBlock: variant === "share" ? 4 : 3,
          }}
          className="shrink-0 rounded-xs border border-border-strong bg-surface-muted font-semibold tabular-nums text-foreground-body"
        >
          {signedScore(score.rawScore)} · {summaryLabel}
        </span>
      </div>

      <div style={{ marginTop: size.gapPx }} className="flex items-end justify-between gap-4">
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
        aria-label={`${axis.name}: ${
          !showsDirection
            ? isExactCenter
              ? "두 방향의 점수가 같은 균형 구간"
              : `${directionLabel} 방향의 균형 구간`
            : `${directionLabel} 쪽, ${band?.label ?? "방향 확인"}`
        }, 축 점수 ${signedScore(score.rawScore)}`}
      >
        {!showsDirection && (
          <span
            aria-hidden="true"
            className="result-axis-balanced-zone absolute inset-y-0"
            style={{ left: `${balancedLeft}%`, width: `${balancedRight - balancedLeft}%` }}
          />
        )}

        {fillWidth > 0 && showsDirection && (
          <span
            aria-hidden="true"
            data-direction={score.direction}
            className="result-axis-fill absolute inset-y-0"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
        )}

        <span
          aria-hidden="true"
          className="absolute inset-y-[-0.25rem] left-1/2 w-px -translate-x-1/2 bg-border-strong"
        />
        <span
          aria-hidden="true"
          data-direction={showsDirection ? score.direction : "balanced"}
          style={{
            left: `${markerPercent}%`,
            width: size.marker,
            height: size.marker,
            borderWidth: variant === "share" ? 3 : 2,
          }}
          className="result-axis-marker absolute top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid border-surface"
        />
      </div>
    </div>
  );
}
