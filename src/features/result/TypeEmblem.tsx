import type { PoleSide } from "@/domain/assessment/model/definition";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 유형 엠블럼 (DEC-039)
 *
 * ⚠️ **고치기 전에 `docs/type-emblem.md`를 읽으세요.**
 * 왜 이 모양인지, 무엇을 지켜야 하는지, 어떻게 교체하는지가 전부 그 문서에 있습니다.
 * 고친 뒤에는 그 문서도 함께 갱신해 주세요.
 *
 * 한 줄 요약: 장식이 아니라 **4축 결과를 도형으로 옮긴 것**입니다.
 * 마크를 보면 네 축이 각각 어느 쪽인지 읽힙니다.
 *
 * 매핑 (docs/type-emblem.md 2절)
 *   axes[0] → 방사선 방향   positive 바깥으로 뻗음 / negative 안으로 모임
 *   axes[1] → 중심 도형     positive 각진 마름모   / negative 둥근 원
 *   axes[2] → 중심 채움     positive 꽉 찬 면      / negative 테두리만
 *   axes[3] → 바깥 링       positive 닫힌 원       / negative 한 곳이 열린 원
 *
 * 지켜야 하는 것 (같은 문서 4절)
 *   - **축 id를 하드코딩하지 않습니다.** `axes` 배열의 순서로만 매핑합니다.
 *     축 id로 분기하면 다음 검사에서 엠블럼이 깨집니다 (AGENTS.md 7절 — features/는 0줄)
 *   - **유형마다 색을 다르게 주지 않습니다.** 16종 전부 같은 색을 씁니다.
 *     색으로 구분하면 색맹 사용자에게 정보가 사라집니다 (AGENTS.md 5절)
 *   - 축이 4개가 아니어도 죽지 않습니다. 결과 화면이 엠블럼 때문에 깨지면 안 됩니다
 */

const SIZE = 120;
const CENTER = SIZE / 2;
const RING_RADIUS = 44;
const STROKE = 3;

/** 12시 방향을 0°로 두고 각도를 라디안으로 바꿉니다. */
function toRadians(degrees: number): number {
  return ((degrees - 90) * Math.PI) / 180;
}

function pointAt(degrees: number, radius: number): readonly [number, number] {
  const radians = toRadians(degrees);
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 바깥 링 — 닫힌 원 또는 위쪽이 열린 원 */
function Ring({ closed }: { readonly closed: boolean }) {
  if (closed) {
    return (
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--em-line)"
        strokeWidth={STROKE}
      />
    );
  }

  // 위쪽 −56° ~ +56° 를 비웁니다. 방사선이 대각선에 있어 틈과 겹치지 않습니다.
  const [startX, startY] = pointAt(56, RING_RADIUS);
  const [endX, endY] = pointAt(304, RING_RADIUS);

  return (
    <path
      d={`M ${round(startX)} ${round(startY)} A ${RING_RADIUS} ${RING_RADIUS} 0 1 1 ${round(endX)} ${round(endY)}`}
      fill="none"
      stroke="var(--em-line)"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  );
}

/** 방사선 4개 — 링 바깥으로 뻗거나 중심을 향해 모입니다 */
function Rays({ outward }: { readonly outward: boolean }) {
  const angles = [45, 135, 225, 315];
  const [innerRadius, outerRadius] = outward
    ? [RING_RADIUS + 5, RING_RADIUS + 15]
    : [RING_RADIUS - 11, RING_RADIUS - 21];

  return (
    <>
      {angles.map((angle) => {
        const [x1, y1] = pointAt(angle, innerRadius);
        const [x2, y2] = pointAt(angle, outerRadius);
        return (
          <line
            key={angle}
            x1={round(x1)}
            y1={round(y1)}
            x2={round(x2)}
            y2={round(y2)}
            stroke="var(--em-line)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

/** 중심 도형 — 마름모/원 × 채움/테두리 */
function Core({ angular, filled }: { readonly angular: boolean; readonly filled: boolean }) {
  const paint = filled
    ? { fill: "var(--em-core)" }
    : { fill: "none", stroke: "var(--em-core)", strokeWidth: STROKE };

  if (angular) {
    const half = 15;
    return (
      <path
        d={`M ${CENTER} ${CENTER - half} L ${CENTER + half} ${CENTER} L ${CENTER} ${CENTER + half} L ${CENTER - half} ${CENTER} Z`}
        strokeLinejoin="round"
        {...paint}
      />
    );
  }

  return <circle cx={CENTER} cy={CENTER} r={13.5} {...paint} />;
}

/**
 * 축 순서대로 방향을 읽습니다.
 *
 * 축이 4개보다 적으면 없는 자리는 positive로 봅니다.
 * 축 id를 보지 않고 **순서만** 봅니다 — 이게 이 파일의 가장 중요한 제약입니다.
 */
function poleReader(
  axisIds: readonly AxisId[],
  poles: Readonly<Record<AxisId, PoleSide>>,
): (index: number) => boolean {
  return (index) => {
    const axisId = axisIds[index];
    if (axisId === undefined) return true;
    return poles[axisId] !== "negative";
  };
}

export function TypeEmblem({
  axisIds,
  poles,
  size = 96,
  label,
  decorative = false,
}: {
  /** `definition.axes`의 id를 **그 순서 그대로** 넘겨 주세요. */
  readonly axisIds: readonly AxisId[];
  readonly poles: Readonly<Record<AxisId, PoleSide>>;
  readonly size?: number;
  /** 스크린리더용 설명. 결과 키를 넣지 마세요 (AGENTS.md 1.1) */
  readonly label?: string;
  /** 이미 상위에서 aria-hidden 처리된 곳(저장 이미지)에서는 true */
  readonly decorative?: boolean;
}) {
  if (axisIds.length === 0) return null;

  const isPositive = poleReader(axisIds, poles);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      focusable="false"
      {...(decorative
        ? { "aria-hidden": true as const }
        : { role: "img", "aria-label": label ?? "결과 유형 상징" })}
    >
      <Ring closed={isPositive(3)} />
      <Rays outward={isPositive(0)} />
      <Core angular={isPositive(1)} filled={isPositive(2)} />
    </svg>
  );
}
