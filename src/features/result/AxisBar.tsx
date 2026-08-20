import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";

/**
 * 축 하나의 시각화 (docs/design.md 11.2)
 *
 * 마커 위치는 연속 점수에서 계산한 `normalized`를 그대로 씁니다.
 * 강도 구간으로 뭉뚱그리지 않기 때문에, 같은 '뚜렷'이라도 위치가 다르게 보입니다.
 *
 * 0점(균형)일 때는 어느 쪽도 강조하지 않습니다 — 양쪽 라벨을 같은 톤으로 둡니다 (DEC-001).
 *
 * 화면용과 공유 이미지용이 같은 컴포넌트입니다. `variant`로 크기만 바꿉니다.
 */

export type AxisBarVariant = "screen" | "share";

const SIZE = {
  screen: { track: 8, marker: 16, labelPx: 14, badgePx: 13, gapPx: 10 },
  share: { track: 12, marker: 24, labelPx: 21, badgePx: 18, gapPx: 14 },
} as const;

/** 구간이 뒤로 갈수록(=성향이 뚜렷할수록) 배경을 한 단계씩 올립니다. */
const BADGE_BACKGROUND = [
  "var(--color-surface-muted)",
  "var(--color-primary-soft)",
  "var(--color-accent-soft)",
];

export function AxisBar({
  axis,
  score,
  variant = "screen",
}: {
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
  readonly variant?: AxisBarVariant;
}) {
  const size = SIZE[variant];

  const bandIndex = axis.intensityBands.findIndex((band) => band.id === score.intensityBandId);
  const band = bandIndex === -1 ? undefined : axis.intensityBands[bandIndex];
  const badgeBackground =
    BADGE_BACKGROUND[Math.min(Math.max(bandIndex, 0), BADGE_BACKGROUND.length - 1)];

  const markerPercent = Math.min(Math.max(score.normalized, 0), 1) * 100;

  // 강조 규칙: 기운 쪽만 진하게. 균형이면 양쪽을 같은 톤으로 둡니다.
  const emphasized = "var(--color-foreground)";
  const quiet = "var(--color-foreground-subtle)";
  const neutral = "var(--color-foreground-muted)";
  const negativeColor = score.isBalanced ? neutral : score.direction === "negative" ? emphasized : quiet;
  const positiveColor = score.isBalanced ? neutral : score.direction === "positive" ? emphasized : quiet;
  const leaningLabel = score.isBalanced
    ? "균형"
    : `${score.direction === "positive" ? axis.positive.label : axis.negative.label} 쪽`;
  const summaryLabel = band === undefined ? leaningLabel : `${leaningLabel} · ${band.label}`;

  return (
    <div
      style={{ paddingBlock: variant === "share" ? size.gapPx : undefined }}
      className={variant === "screen" ? "py-5" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p style={{ fontSize: size.labelPx, color: "var(--color-foreground)" }} className="font-semibold">
          {axis.name}
        </p>
        <span
          style={{
            fontSize: size.badgePx,
            background: badgeBackground,
            paddingInline: variant === "share" ? 12 : 8,
            paddingBlock: variant === "share" ? 4 : 2,
          }}
          className="inline-block rounded-xs font-medium text-foreground-body"
        >
          {summaryLabel}
        </span>
      </div>

      <div style={{ marginTop: size.gapPx }} className="flex items-baseline justify-between gap-4">
        <span style={{ fontSize: size.labelPx, fontWeight: 600, color: negativeColor }}>
          {axis.negative.label}
        </span>
        <span
          style={{ fontSize: size.labelPx, fontWeight: 600, color: positiveColor }}
          className="text-right"
        >
          {axis.positive.label}
        </span>
      </div>

      <div
        style={{ marginTop: size.gapPx, height: size.track }}
        className="relative w-full rounded-full bg-surface-inset"
      >
        {/* 0점(정중앙) 눈금 */}
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border-strong"
        />
        {/* 연속 점수 마커 */}
        <span
          aria-hidden="true"
          style={{
            left: `${markerPercent}%`,
            width: size.marker,
            height: size.marker,
            borderWidth: variant === "share" ? 3 : 2,
          }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid border-surface bg-accent"
        />
      </div>

      {/* 화면에는 막대로 보이지만, 스크린리더에는 문장으로 읽어 줍니다. */}
      <span className="sr-only">
        {axis.name}: {score.isBalanced
          ? `양쪽이 비슷한 균형 상태입니다. ${band?.label ?? ""}`
          : `${score.direction === "positive" ? axis.positive.label : axis.negative.label} 쪽입니다. ${band?.label ?? ""}`}
      </span>
    </div>
  );
}
