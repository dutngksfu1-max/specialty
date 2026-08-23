import { describe, expect, it } from "vitest";

import { resolveIntensity, scoreAssessment } from "@/domain/assessment/scoring/scoring";
import { toQuestionId, toSessionId } from "@/domain/shared/ids";
import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

/**
 * 균형 구간 보정 (DEC-052)
 *
 * **이 파일이 막으려는 사고**
 *
 * 축 점수는 정방향 6문항에서 역방향 6문항을 뺀 값입니다. 그래서 아무렇게나 답해도
 * 점수가 0 근처에 모입니다. 잡음의 표준편차가 약 4.9점인데, 예전 균형 구간이 0~5여서
 * **잡음 구간을 통째로 "균형"이라고 부르고 있었습니다.**
 * 실제로 무작위 응답에서 축 하나가 균형으로 판정될 확률이 73%, 네 축 모두 균형이 28%였습니다.
 *
 * 균형 구간을 다시 넓히면 같은 사고가 조용히 돌아옵니다. 사람이 눈으로 못 잡는 종류라
 * 기계가 지킵니다.
 */

const parsed = parseAssessmentDefinition(teacherStyleV1Package);
if (!parsed.ok) throw new Error(`콘텐츠 검증 실패: ${parsed.error.detail ?? ""}`);
const definition = parsed.value;

/** 재현 가능한 난수. 테스트가 실행할 때마다 결과가 흔들리면 가드가 되지 못합니다. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const probeSessionId = toSessionId("balance-calibration-probe");

function scoreWith(pick: (polarity: number) => number) {
  const responses = definition.questions.map((question) => ({
    sessionId: probeSessionId,
    questionId: toQuestionId(String(question.id)),
    value: pick(question.polarity),
    answeredAt: "2026-08-23T00:00:00.000Z",
  }));

  const result = scoreAssessment(definition, responses);
  if (!result.ok) throw new Error(result.error.code);
  return result.value.axisScores;
}

function isBalancedBand(axisId: string, rawScore: number): boolean {
  const axis = definition.axes.find((item) => String(item.id) === axisId);
  if (axis === undefined) throw new Error(axisId);
  return !resolveIntensity(Math.abs(rawScore), axis.intensityBands).directional;
}

describe("균형 구간 보정 (DEC-052)", () => {
  it("균형 구간은 정확히 0점 하나뿐입니다", () => {
    for (const axis of definition.axes) {
      const nonDirectional = axis.intensityBands.filter((band) => !band.directional);

      expect(nonDirectional, String(axis.id)).toHaveLength(1);
      expect(nonDirectional[0]?.minAbsScore, String(axis.id)).toBe(0);
      expect(nonDirectional[0]?.maxAbsScore, String(axis.id)).toBe(0);
    }
  });

  it("1점만 기울어도 방향 구간입니다", () => {
    for (const axis of definition.axes) {
      expect(resolveIntensity(1, axis.intensityBands).directional, String(axis.id)).toBe(true);
    }
  });

  it("무작위 응답에서 축 하나가 균형일 확률이 15%를 넘지 않습니다", () => {
    // 잡음이 균형으로 둔갑하는 비율입니다. 예전 구간(0~5)에서는 73%였습니다.
    const TRIALS = 3000;
    const random = makeRandom(20260823);
    let balancedAxes = 0;
    let allFourBalanced = 0;

    for (let trial = 0; trial < TRIALS; trial += 1) {
      const scores = scoreWith(() => 1 + Math.floor(random() * 5));
      const balanced = scores.filter((score) =>
        isBalancedBand(String(score.axisId), score.rawScore),
      ).length;

      balancedAxes += balanced;
      if (balanced === scores.length) allFourBalanced += 1;
    }

    const perAxisRate = balancedAxes / (TRIALS * definition.axes.length);
    const allFourRate = allFourBalanced / TRIALS;

    expect(perAxisRate, `축당 균형 비율 ${(perAxisRate * 100).toFixed(1)}%`).toBeLessThan(0.15);
    expect(allFourRate, `네 축 모두 균형 ${(allFourRate * 100).toFixed(1)}%`).toBeLessThan(0.01);
  });

  it("성향이 조금이라도 있는 사람은 균형으로 떨어지지 않습니다", () => {
    // 정방향에 4점, 역방향에 2점 — 문항당 겨우 1점씩 기운 아주 약한 성향입니다.
    const scores = scoreWith((polarity) => (polarity === 1 ? 4 : 2));

    for (const score of scores) {
      expect(isBalancedBand(String(score.axisId), score.rawScore), String(score.axisId)).toBe(
        false,
      );
    }
  });

  /**
   * 남아 있는 한계를 테스트로 적어 둡니다.
   *
   * 모든 문항에 같은 값을 찍으면 정·역이 상쇄되어 반드시 0점이 됩니다. 이것은 버그가 아니라
   * 묵종 편향을 상쇄하는 설계의 결과이며, "아무 정보도 주지 않은 응답"에 방향을 붙이지
   * 않는 편이 옳습니다. 다만 이 경우가 균형으로 보인다는 사실은 알고 있어야 합니다.
   */
  it("모든 문항에 같은 값을 찍으면 정확히 0점이 됩니다 — 설계상 그렇습니다", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const scores = scoreWith(() => value);
      for (const score of scores) {
        expect(score.rawScore, `전부 ${value}점 · ${String(score.axisId)}`).toBe(0);
      }
    }
  });
});
