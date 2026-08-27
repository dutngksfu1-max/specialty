import type {
  AssessmentAxis,
  PoleSide,
  TypeCodeSpec,
} from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 유형 코드 조립 (DEC-049 · DEC-064)
 *
 * 축 하나가 코드의 한 자리입니다. 자리 순서는 `definition.axes` 배열 순서를 그대로 따르며,
 * 결과 키(pppp … nnnn)의 자리 순서와도 같습니다.
 *
 * **엔진은 글자를 모릅니다.** 어떤 글자를 쓸지는 `AxisPole.code`가, 균형 자리에서 두 글자를
 * 무엇으로 이을지는 `TypeCodeSpec.balancedSeparator`가 정합니다. 그래서 다음 검사가 축
 * 3개짜리에 전혀 다른 글자를 쓰더라도 이 함수와 화면은 한 줄도 고치지 않습니다 (AGENTS.md 7절).
 *
 * 채점 결과를 읽기만 하므로 **동기 순수 함수**입니다 (AGENTS.md 2.2).
 */

/**
 * 콘텐츠가 상한을 정하지 않았을 때 나열할 환산 후보의 최대 개수.
 *
 * 검사별 숫자가 아니라 "몇 개까지 한눈에 읽히는가"라는 방법의 매개변수입니다.
 * 균형 자리 2개(후보 4개)까지는 격자로 읽히고, 3개(후보 8개)부터는 읽을 수 없습니다.
 */
const DEFAULT_MAX_CROSSWALK_CANDIDATES = 4;

export interface TypeCodeSlot {
  readonly axisId: AxisId;
  /**
   * 이 자리에 찍히는 글자 (DEC-064)
   *
   * 방향이 있으면 한 개, 균형이면 **두 개**입니다. 균형 자리를 비우지 않는 이유는
   * 어느 쪽으로도 기울지 않았다는 것이 "아무것도 아니다"가 아니라 "둘 다일 수 있다"이기
   * 때문입니다. 순서는 항상 positive → negative입니다.
   */
  readonly letters: readonly string[];
  /** 균형 자리면 null — 어느 한쪽으로 단정하지 않습니다 (DEC-046) */
  readonly poleSide: PoleSide | null;
  /** `letters`와 같은 순서의 극 이름. 균형이면 두 개 */
  readonly poleLabels: readonly string[];
  readonly isBalanced: boolean;
}

export interface TypeCode {
  /** 자리 글자를 이어 붙인 것. 예: `"GARM"` · 균형이 있으면 `"GA R/C M"` 대신 `"GAR/CM"` */
  readonly code: string;
  readonly slots: readonly TypeCodeSlot[];
  readonly hasBalancedSlot: boolean;
  /**
   * 다른 검사로의 환산 후보 (DEC-064)
   *
   * 균형 자리 하나마다 후보가 두 배가 됩니다 (0개→1 · 1개→2 · 2개→4).
   * 다음 중 하나라도 해당하면 **빈 배열**입니다.
   *   - 콘텐츠가 `crosswalk` 규격 또는 극별 `crosswalkCode`를 주지 않음
   *   - 후보 수가 상한을 넘음 (이때 `crosswalkTruncated`가 true)
   */
  readonly crosswalkCodes: readonly string[];
  /** 후보가 너무 많아 나열하지 않았습니다. 화면은 `unavailableNote`를 씁니다 */
  readonly crosswalkTruncated: boolean;
}

/**
 * 균형 판정은 호출자가 넘긴 `balancedAxisIds`를 그대로 믿습니다.
 *
 * `AxisScore.isBalanced`(정확히 0점)가 아니라 `resolveResultNarrative`가 정한 균형 축을
 * 써야 하기 때문입니다. 동점 보정으로 방향을 찾은 축은 0점이어도 균형이 아닙니다 (DEC-063).
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
  /** 자리마다의 환산 글자 후보. 균형 자리는 두 개가 들어갑니다 */
  const crosswalkChoices: string[][] = [];
  let crosswalkComplete = true;

  for (const axis of axes) {
    const score = scoreByAxis.get(axis.id);
    // 축과 점수가 어긋나면 반쪽짜리 코드를 만들지 않고 통째로 포기합니다.
    // 틀린 코드보다 없는 코드가 낫습니다.
    if (score === undefined) return null;

    const isBalanced = balancedAxisIds.has(axis.id);
    const pole = score.direction === "positive" ? axis.positive : axis.negative;

    const positiveCode = axis.positive.code;
    const negativeCode = axis.negative.code;
    if (positiveCode === undefined || negativeCode === undefined) return null;
    const poleCode = score.direction === "positive" ? positiveCode : negativeCode;

    slots.push({
      axisId: axis.id,
      letters: isBalanced ? [positiveCode, negativeCode] : [poleCode],
      poleSide: isBalanced ? null : pole.side,
      poleLabels: isBalanced
        ? [axis.positive.shortLabel, axis.negative.shortLabel]
        : [pole.shortLabel],
      isBalanced,
    });

    const declared = isBalanced
      ? [axis.positive.crosswalkCode, axis.negative.crosswalkCode]
      : [pole.crosswalkCode];
    const choices = declared.filter((choice): choice is string => choice !== undefined);
    // 한 자리라도 빠지면 환산을 통째로 포기합니다. 빠진 자리를 지어내면 근사가 아니라 거짓입니다.
    if (choices.length !== declared.length) crosswalkComplete = false;
    else crosswalkChoices.push(choices);
  }

  const hasBalancedSlot = slots.some((slot) => slot.isBalanced);
  const separator = spec.balancedSeparator;

  const { codes, truncated } =
    crosswalkComplete && spec.crosswalk !== undefined
      ? expandCrosswalkCodes(
          crosswalkChoices,
          spec.crosswalk.maxCandidates ?? DEFAULT_MAX_CROSSWALK_CANDIDATES,
        )
      : { codes: [], truncated: false };

  return {
    code: slots.map((slot) => slot.letters.join(separator)).join(""),
    slots,
    hasBalancedSlot,
    crosswalkCodes: codes,
    crosswalkTruncated: truncated,
  };
}

/**
 * 자리마다의 후보 글자를 모든 조합으로 펼칩니다 (DEC-064).
 *
 * 균형 자리가 없으면 후보는 하나뿐이라 예전과 똑같이 동작합니다.
 * 네 글자 문자열은 **여기서 실행 중에만 만들어집니다.** 소스 어디에도 적혀 있지 않으므로
 * 저장소 전체 금지 표현 검사는 계속 0건입니다 (AGENTS.md 1.1 · 9절).
 */
function expandCrosswalkCodes(
  choicesPerSlot: readonly (readonly string[])[],
  maxCandidates: number,
): { codes: readonly string[]; truncated: boolean } {
  if (choicesPerSlot.length === 0) return { codes: [], truncated: false };

  const total = choicesPerSlot.reduce((count, choices) => count * choices.length, 1);
  // 여덟 개를 늘어놓으면 읽을 수 없습니다. 반쯤 잘라 보여 주면 나머지가 없는 것처럼 보이므로
  // 아예 나열하지 않고 안내 문구로 넘깁니다.
  if (total > maxCandidates) return { codes: [], truncated: true };

  let codes: string[] = [""];
  for (const choices of choicesPerSlot) {
    codes = codes.flatMap((prefix) => choices.map((letter) => prefix + letter));
  }
  return { codes, truncated: false };
}
