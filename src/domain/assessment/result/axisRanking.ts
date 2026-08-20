import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 축 순위 — 무게중심 (docs/PRD-result-v2.md 4.5)
 *
 * 네 축을 같은 무게로 늘어놓으면 "그래서 나는 뭐지"가 남지 않습니다.
 * 어느 관점이 더 도드라지는지를 순서로 보여 줍니다.
 *
 * **사람 사이의 서열이 아닙니다.** `AGENTS.md` 6절이 금지하는 순위는 백분위·등급처럼
 * 남과 비교하는 것이고, 여기서 매기는 순서는 **한 사람 안에서** 어느 축이 더 기울었는지입니다.
 * 비교 대상이 자기 자신이므로 화면에도 "내 안에서"라고 밝힙니다.
 *
 * 동기 순수 함수입니다 (AGENTS.md 2.2).
 */

/**
 * 1위와 2위를 갈라 놓기 위해 필요한 최소 차이입니다.
 *
 * 축이 낼 수 있는 최대 절대 점수 대비 비율로 둡니다.
 * 12문항 × 최대 편차 2 = 24점이면 3점이 됩니다.
 * 검사별 숫자를 엔진에 박지 않기 위한 방식입니다 (AGENTS.md 1.3).
 */
const DISTINCT_MARGIN_RATIO = 0.125;

export interface RankedAxis {
  readonly axisId: AxisId;
  /** 방향을 뺀 기울기 크기. 순위는 이 값으로만 정합니다. */
  readonly absScore: number;
}

export interface AxisRanking {
  /** 기울기가 큰 순서. 동점이면 축 정의 순서를 따릅니다. */
  readonly ordered: readonly RankedAxis[];
  /**
   * 1위와 2위가 충분히 벌어졌을 때만 채웁니다.
   *
   * 차이가 작은데 "주축"이라고 부르면, 사실상 비슷한 두 관점 중
   * 하나를 임의로 골라 앞세우는 것이 됩니다.
   */
  readonly primary?: RankedAxis;
  readonly secondary?: RankedAxis;
  /** 1·2위가 비슷하면 true — 화면은 "비슷하게 도드라지는 두 관점"으로 서술합니다. */
  readonly isTied: boolean;
}

/** 이 축이 낼 수 있는 최대 절대 점수입니다. */
function axisExtent(score: AxisScore): number {
  return Math.max(Math.abs(score.minScore), Math.abs(score.maxScore));
}

export function resolveAxisRanking(
  axes: readonly AssessmentAxis[],
  axisScores: readonly AxisScore[],
): AxisRanking {
  const scoreByAxis = new Map(axisScores.map((score) => [score.axisId, score]));

  // 축 정의 순서를 먼저 깔아 두면, 동점일 때 순서가 흔들리지 않습니다.
  const scores = axes
    .map((axis) => scoreByAxis.get(axis.id))
    .filter((score): score is AxisScore => score !== undefined);

  const ordered = scores
    .map((score): RankedAxis => ({ axisId: score.axisId, absScore: Math.abs(score.rawScore) }))
    .sort((a, b) => b.absScore - a.absScore);

  const first = ordered[0];
  const second = ordered[1];
  if (first === undefined || second === undefined) {
    return { ordered, isTied: false };
  }

  const topScore = scoreByAxis.get(first.axisId);
  if (topScore === undefined) return { ordered, isTied: false };

  const margin = DISTINCT_MARGIN_RATIO * axisExtent(topScore);
  if (first.absScore - second.absScore < margin) {
    return { ordered, isTied: true };
  }

  return { ordered, primary: first, secondary: second, isTied: false };
}
