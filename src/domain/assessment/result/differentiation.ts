import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import type { AxisId, QuestionId } from "@/domain/shared/ids";

/**
 * 응답 분화 — 0점이 '진짜 대칭'인지 '답이 갈리지 않은 것'인지 가려냅니다 (DEC-053)
 *
 * **왜 필요한가**
 *
 * 축 점수는 `정방향 6문항 − 역방향 6문항`입니다. 두 묶음에 같은 값을 주면 **반드시 0**이 됩니다.
 * 전부 3점이든, 전부 4점이든, 전부 5점이든 결과는 똑같이 0입니다.
 *
 * 그래서 0점 하나에 서로 다른 세 가지가 섞여 있습니다.
 *   ① 양쪽으로 갈렸는데 합이 0      → 진짜 대칭. '균형'이라고 부를 만합니다
 *   ② 모든 문항을 같은 값으로 찍음   → 정보 없음. 균형이 아닙니다
 *   ③ 척도 가운데에만 머무름        → 정보 없음. 균형이 아닙니다
 *
 * ②·③을 '균형'이라고 부르면, 답을 고르지 않은 사람에게 "두 성향을 고루 쓰시네요"라고
 * 말하게 됩니다. 그건 해석이 아니라 지어내기입니다.
 *
 * 이 파일은 **동기 순수 함수**입니다 (AGENTS.md 2.2).
 */

/**
 * 이 값 미만으로 척도를 썼으면 분화되지 않은 것으로 봅니다.
 *
 * 2 = "가장 높게 준 값과 가장 낮게 준 값의 차이가 2점 이상". 5점 척도에서
 * 3과 4만 오간 사람(차이 1)은 어디에도 반대하지 않은 것이라 방향을 읽을 근거가 없습니다.
 *
 * 척도 폭에 대한 비율이 아니라 절대값인 이유: 이 판정은 "반대편에도 표를 줬는가"를 묻는
 * 것이라, 7점 척도가 되어도 뜻이 그대로 유지됩니다.
 */
const MIN_VALUE_RANGE = 2;

export interface AxisDifferentiation {
  readonly axisId: AxisId;
  /** 이 축에서 실제로 쓴 서로 다른 응답값의 개수 */
  readonly distinctValues: number;
  /** 가장 높게 준 값 − 가장 낮게 준 값 */
  readonly valueRange: number;
  /** false면 0점이 나와도 '균형'이라고 부르지 않습니다 */
  readonly isDifferentiated: boolean;
}

/**
 * 축마다 응답이 실제로 갈렸는지 봅니다.
 *
 * 정렬(polarity 적용) 전의 **원래 응답값**을 봅니다. 정렬한 값으로 보면
 * "전부 4점"이 정방향 +1 / 역방향 −1로 흩어져 보여, 찍기와 진짜 대칭이 구별되지 않습니다.
 */
export function resolveDifferentiation(
  definition: AssessmentDefinition,
  responses: readonly AssessmentResponse[],
): readonly AxisDifferentiation[] {
  const valueByQuestion = new Map<QuestionId, number>(
    responses.map((response) => [response.questionId, response.value]),
  );

  return definition.axes.map((axis) => {
    const values = definition.questions
      .filter((question) => question.axisId === axis.id)
      .flatMap((question) => {
        const value = valueByQuestion.get(question.id);
        return value === undefined ? [] : [value];
      });

    // 답이 없으면 갈렸다고 말할 수 없습니다. 없는 근거를 있는 척하지 않습니다.
    if (values.length === 0) {
      return { axisId: axis.id, distinctValues: 0, valueRange: 0, isDifferentiated: false };
    }

    const valueRange = Math.max(...values) - Math.min(...values);

    return {
      axisId: axis.id,
      distinctValues: new Set(values).size,
      valueRange,
      isDifferentiated: valueRange >= MIN_VALUE_RANGE,
    };
  });
}

/**
 * 0점이면서 응답이 갈리지 않은 축을 모읍니다.
 *
 * 화면은 이 축들을 '균형'이 아니라 **'이 관점은 읽기 어려웠다'**로 다뤄야 합니다.
 * 0점이 아닌 축은 방향이 있으므로 여기 들어오지 않습니다.
 */
export function resolveUnreadableAxisIds(
  differentiation: readonly AxisDifferentiation[],
  rawScoreByAxis: ReadonlyMap<AxisId, number>,
): ReadonlySet<AxisId> {
  return new Set(
    differentiation
      .filter((item) => !item.isDifferentiated && rawScoreByAxis.get(item.axisId) === 0)
      .map((item) => item.axisId),
  );
}
