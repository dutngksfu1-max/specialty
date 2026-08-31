import type {
  AssessmentAxis,
  PoleSide,
  TypeCodeSpec,
} from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 유형 코드 조립 (DEC-049 · DEC-068)
 *
 * 축 하나가 코드의 한 자리이고, **한 자리에는 언제나 글자 하나**입니다. 자리 순서는
 * `definition.axes` 배열 순서를 그대로 따르며, 결과 키(pppp … nnnn)의 자리 순서와도 같습니다.
 *
 * 예전에는 점수가 정확히 0인 자리에 두 글자를 함께 찍었습니다(DEC-064).
 * 지금은 그 자리도 방향을 하나 갖습니다. `AxisScore.direction`이 동점 보정과
 * `axis.defaultPole`로 이미 한쪽을 정해서 옵니다. 5~10분을 들인 사람에게
 * "이 자리는 둘 다일 수 있어요"라고 돌려주지 않기 위한 규칙입니다.
 *
 * **엔진은 글자를 모릅니다.** 어떤 글자를 쓸지는 `AxisPole.code`가 정합니다. 그래서 다음
 * 검사가 축 3개짜리에 전혀 다른 글자를 쓰더라도 이 함수와 화면은 그대로입니다 (AGENTS.md 7절).
 *
 * 채점 결과를 읽기만 하므로 **동기 순수 함수**입니다 (AGENTS.md 2.2).
 */

export interface TypeCodeSlot {
  readonly axisId: AxisId;
  /** 이 자리에 찍히는 글자 하나 */
  readonly letter: string;
  readonly poleSide: PoleSide;
  readonly poleLabel: string;
}

export interface TypeCode {
  /** 자리 글자를 이어 붙인 것. 예: `"GARM"` */
  readonly code: string;
  readonly slots: readonly TypeCodeSlot[];
  /**
   * 다른 검사로의 환산 코드 (DEC-049)
   *
   * 콘텐츠가 `crosswalk` 규격이나 극별 `crosswalkCode`를 주지 않으면 `null`입니다.
   * 한 자리라도 빠지면 통째로 포기합니다 — 빠진 자리를 지어내면 근사가 아니라 거짓입니다.
   */
  readonly crosswalkCode: string | null;
}

export function buildTypeCode(
  axes: readonly AssessmentAxis[],
  axisScores: readonly AxisScore[],
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

    const pole = score.direction === "positive" ? axis.positive : axis.negative;
    if (pole.code === undefined) return null;

    slots.push({
      axisId: axis.id,
      letter: pole.code,
      poleSide: pole.side,
      poleLabel: pole.shortLabel,
    });

    if (pole.crosswalkCode === undefined) crosswalkComplete = false;
    else crosswalkLetters.push(pole.crosswalkCode);
  }

  /*
    환산 네 글자는 **여기서 실행 중에만 만들어집니다.** 소스 어디에도 적혀 있지 않으므로
    저장소 전체 금지 표현 검사는 계속 0건입니다 (AGENTS.md 1.1 · 9절).
  */
  const crosswalkCode =
    crosswalkComplete && spec.crosswalk !== undefined ? crosswalkLetters.join("") : null;

  return {
    code: slots.map((slot) => slot.letter).join(""),
    slots,
    crosswalkCode,
  };
}
