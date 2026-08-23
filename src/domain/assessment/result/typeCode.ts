import type {
  AssessmentAxis,
  PoleSide,
  TypeCodeSpec,
} from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 유형 코드 조립 (DEC-049)
 *
 * 축 하나가 코드의 한 자리입니다. 자리 순서는 `definition.axes` 배열 순서를 그대로 따르며,
 * 결과 키(pppp … nnnn)의 자리 순서와도 같습니다.
 *
 * **엔진은 글자를 모릅니다.** 어떤 글자를 쓸지는 `AxisPole.code`가, 균형 자리에 무엇을 넣을지는
 * `TypeCodeSpec.balancedLetter`가 정합니다. 그래서 다음 검사가 축 3개짜리에 전혀 다른 글자를
 * 쓰더라도 이 함수와 화면은 한 줄도 고치지 않습니다 (AGENTS.md 7절).
 *
 * 채점 결과를 읽기만 하므로 **동기 순수 함수**입니다 (AGENTS.md 2.2).
 */

export interface TypeCodeSlot {
  readonly axisId: AxisId;
  /** 이 자리에 찍히는 글자 한 개. 균형이면 `spec.balancedLetter` */
  readonly letter: string;
  /** 균형 자리면 null — 어느 한쪽으로 단정하지 않습니다 (DEC-046) */
  readonly poleSide: PoleSide | null;
  /** 균형 자리면 null */
  readonly poleLabel: string | null;
  readonly isBalanced: boolean;
}

export interface TypeCode {
  /** 자리 글자를 이어 붙인 것. 예: "GARM" · "G·RM" */
  readonly code: string;
  readonly slots: readonly TypeCodeSlot[];
  readonly hasBalancedSlot: boolean;
  /**
   * 다른 검사로의 환산 코드. 다음 중 하나라도 해당하면 null입니다.
   *   - 균형 자리가 하나라도 있음 (한쪽으로 단정할 수 없음 — DEC-046)
   *   - 콘텐츠가 `crosswalk` 규격 또는 극별 `crosswalkCode`를 주지 않음
   */
  readonly crosswalkCode: string | null;
}

/**
 * 균형 판정은 호출자가 넘긴 `balancedAxisIds`를 그대로 믿습니다.
 *
 * `AxisScore.isBalanced`(정확히 0점)가 아니라 `resolveResultNarrative`가 rawScore로 다시 계산한
 * 균형 **구간**을 써야 하기 때문입니다. 두 기준이 다르므로 여기서 재계산하지 않습니다.
 */
export function buildTypeCode(
  axes: readonly AssessmentAxis[],
  axisScores: readonly AxisScore[],
  balancedAxisIds: ReadonlySet<AxisId>,
  spec: TypeCodeSpec | undefined,
): TypeCode | null {
  if (spec === undefined || axes.length === 0) return null;

  const scoreByAxis = new Map(axisScores.map((score) => [score.axisId, score]));
  const slots: TypeCodeSlot[] = [];
  const crosswalkLetters: string[] = [];
  let crosswalkComplete = true;

  for (const axis of axes) {
    const score = scoreByAxis.get(axis.id);
    // 축과 점수가 어긋나면 반쪽짜리 코드를 만들지 않고 통째로 포기합니다.
    // 틀린 코드보다 없는 코드가 낫습니다.
    if (score === undefined) return null;

    const isBalanced = balancedAxisIds.has(axis.id);
    const pole = score.direction === "positive" ? axis.positive : axis.negative;

    if (pole.code === undefined) return null;

    slots.push({
      axisId: axis.id,
      letter: isBalanced ? spec.balancedLetter : pole.code,
      poleSide: isBalanced ? null : pole.side,
      poleLabel: isBalanced ? null : pole.shortLabel,
      isBalanced,
    });

    if (isBalanced || pole.crosswalkCode === undefined) {
      crosswalkComplete = false;
    } else {
      crosswalkLetters.push(pole.crosswalkCode);
    }
  }

  const hasBalancedSlot = slots.some((slot) => slot.isBalanced);

  return {
    code: slots.map((slot) => slot.letter).join(""),
    slots,
    hasBalancedSlot,
    crosswalkCode:
      crosswalkComplete && spec.crosswalk !== undefined ? crosswalkLetters.join("") : null,
  };
}
