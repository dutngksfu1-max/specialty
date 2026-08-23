import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { ResolvedAxisNarrative } from "@/domain/assessment/result/narrative";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

const CENTER = 160;
const INNER_RADIUS = 28;
const BALANCED_RADIUS = 54;
const OUTER_RADIUS = 108;
const LABEL_RADIUS = 137;
const OVERLAY_COLORS = [
  "var(--color-chart-overlay-1)",
  "var(--color-chart-overlay-2)",
  "var(--color-chart-overlay-3)",
  "var(--color-chart-overlay-4)",
] as const;

interface BalancePoint {
  readonly axisIndex: number;
  readonly side: "positive" | "negative";
  readonly angle: number;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
  readonly selected: boolean;
  readonly balanced: boolean;
  readonly letter?: string;
}

function polarPoint(angle: number, radius: number): { readonly x: number; readonly y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
}

function normalizedAngle(angle: number): number {
  return (angle + 360) % 360;
}

/**
 * 축마다 마주 보는 두 방향을 하나씩 배정한 다방향 밸런스 지도입니다.
 *
 * 축 수를 고정하지 않고 `축 수 × 2`개의 꼭짓점을 만듭니다. 균형 구간은 중심점으로
 * 접지 않고 양쪽에 같은 반지름을 주어, 부족함이 아니라 두 방향을 함께 쓰는 상태로 읽힙니다.
 */
export function ResultBalanceMap({
  axes,
  scores,
  narratives,
  balancedAxisIds,
}: {
  readonly axes: readonly AssessmentAxis[];
  readonly scores: readonly AxisScore[];
  readonly narratives: readonly ResolvedAxisNarrative[];
  readonly balancedAxisIds: ReadonlySet<AxisId>;
}) {
  const scoreById = new Map(scores.map((score) => [score.axisId, score]));
  const narrativeById = new Map(narratives.map((item) => [item.axisId, item]));
  const points: BalancePoint[] = [];

  axes.forEach((axis, axisIndex) => {
    const score = scoreById.get(axis.id);
    if (score === undefined) return;

    const isBalanced = balancedAxisIds.has(axis.id);
    const extent = Math.max(Math.abs(score.minScore), Math.abs(score.maxScore), 1);
    const strength = Math.min(Math.abs(score.rawScore) / extent, 1);
    const directionalRadius = BALANCED_RADIUS + strength * (OUTER_RADIUS - BALANCED_RADIUS);
    const positiveAngle = -90 + (axisIndex * 180) / Math.max(axes.length, 1);

    (["positive", "negative"] as const).forEach((side) => {
      const angle = side === "positive" ? positiveAngle : positiveAngle + 180;
      const selected = !isBalanced && score.direction === side;
      const radius = isBalanced ? BALANCED_RADIUS : selected ? directionalRadius : INNER_RADIUS;
      const position = polarPoint(angle, radius);
      const pole = side === "positive" ? axis.positive : axis.negative;

      points.push({
        axisIndex,
        side,
        angle,
        radius,
        ...position,
        selected,
        balanced: isBalanced,
        letter: pole.code,
      });
    });
  });

  if (points.length === 0) return null;

  const orderedPoints = [...points].sort(
    (first, second) => normalizedAngle(first.angle) - normalizedAngle(second.angle),
  );
  const polygonPoints = orderedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const alternativeText = axes
    .map((axis) => {
      const score = scoreById.get(axis.id);
      const reading = narrativeById.get(axis.id);
      if (score === undefined) return null;
      if (balancedAxisIds.has(axis.id)) return `${axis.name}은 균형 구간`;
      const pole = score.direction === "positive" ? axis.positive : axis.negative;
      return `${axis.name}은 ${pole.shortLabel}, ${reading?.reading.headline ?? "현재 방향"}`;
    })
    .filter((text): text is string => text !== null)
    .join(". ");

  return (
    <figure className="min-w-0">
      <div className="mx-auto max-w-xs">
        <svg
          viewBox="0 0 320 320"
          className="block h-auto w-full"
          role="img"
          aria-label={`관점별 방향과 기울기 지도. ${alternativeText}`}
        >
          <title>관점별 방향과 기울기 지도</title>
          <desc>{alternativeText}</desc>
          <defs>
            <pattern
              id="result-balance-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="var(--color-chart-neutral)"
                strokeWidth="4"
              />
            </pattern>
          </defs>

          {[INNER_RADIUS, BALANCED_RADIUS, 82, OUTER_RADIUS].map((radius) => (
            <circle
              key={radius}
              cx={CENTER}
              cy={CENTER}
              r={radius}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth="1"
              strokeDasharray={radius === BALANCED_RADIUS ? "4 4" : undefined}
            />
          ))}

          {points.map((point) => {
            const end = polarPoint(point.angle, OUTER_RADIUS);
            return (
              <line
                key={`spoke-${point.axisIndex}-${point.side}`}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke={OVERLAY_COLORS[point.axisIndex % OVERLAY_COLORS.length]}
                strokeWidth="1.5"
                opacity="0.52"
              />
            );
          })}

          {axes.map((axis, axisIndex) => {
            if (!balancedAxisIds.has(axis.id)) return null;
            const angle = -90 + (axisIndex * 180) / Math.max(axes.length, 1);
            const start = polarPoint(angle, BALANCED_RADIUS);
            const end = polarPoint(angle + 180, BALANCED_RADIUS);
            return (
              <line
                key={`balanced-${String(axis.id)}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="url(#result-balance-hatch)"
                strokeWidth="15"
                strokeLinecap="square"
                opacity="0.9"
              />
            );
          })}

          <polygon
            points={polygonPoints}
            fill="var(--color-surface-inset)"
            fillOpacity="0.58"
            stroke="var(--color-foreground-body)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {points.map((point) => {
            if (!point.selected && !point.balanced) return null;
            const color = point.balanced
              ? "var(--color-chart-neutral)"
              : point.side === "positive"
                ? "var(--color-chart-positive)"
                : "var(--color-chart-negative)";

            return point.side === "negative" && !point.balanced ? (
              <path
                key={`tip-${point.axisIndex}-${point.side}`}
                d={`M ${point.x} ${point.y - 7} L ${point.x + 7} ${point.y} L ${point.x} ${point.y + 7} L ${point.x - 7} ${point.y} Z`}
                fill={color}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            ) : (
              <rect
                key={`tip-${point.axisIndex}-${point.side}`}
                x={point.x - 6}
                y={point.y - 6}
                width="12"
                height="12"
                rx={point.balanced ? 1 : 6}
                fill={point.balanced ? "url(#result-balance-hatch)" : color}
                stroke={point.balanced ? "var(--color-foreground-body)" : "var(--color-surface)"}
                strokeWidth="2"
              />
            );
          })}

          {points.map((point) => {
            if (point.letter === undefined) return null;
            const label = polarPoint(point.angle, LABEL_RADIUS);
            return (
              <text
                key={`label-${point.axisIndex}-${point.side}`}
                x={label.x}
                y={label.y}
                dy="0.35em"
                textAnchor="middle"
                fill="var(--color-foreground)"
                fontSize="15"
                fontWeight="700"
              >
                {point.letter}
              </text>
            );
          })}
        </svg>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {axes.map((axis) => {
          const score = scoreById.get(axis.id);
          const reading = narrativeById.get(axis.id);
          if (score === undefined) return null;
          const isBalanced = balancedAxisIds.has(axis.id);
          const pole = score.direction === "positive" ? axis.positive : axis.negative;
          const direction = isBalanced ? "balanced" : score.direction;

          return (
            <li key={String(axis.id)} className="min-w-0 border-l-2 border-border-strong pl-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  data-direction={direction}
                  className="result-balance-key size-3 shrink-0"
                />
                <span className="min-w-0 text-caption font-semibold text-foreground">
                  {axis.name}
                </span>
              </div>
              <p className="mt-1 text-caption text-foreground-muted">
                {isBalanced ? "균형" : pole.shortLabel}
                {reading !== undefined && ` · ${reading.reading.headline}`}
              </p>
              <p className="mt-1 text-caption text-foreground-subtle">
                {axis.negative.code !== undefined && `${axis.negative.code} `}
                {axis.negative.shortLabel} ↔ {axis.positive.shortLabel}
                {axis.positive.code !== undefined && ` ${axis.positive.code}`}
              </p>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
