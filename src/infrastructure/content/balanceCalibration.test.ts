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
 *
 * **동점 보정 (DEC-063)**
 *
 * 균형 구간을 0점 하나로 좁힌 뒤에도, 0점 자체가 축당 약 8%로 자주 나왔습니다
 * (네 축 중 하나라도 0점인 사람이 약 28%). 그래서 0점일 때만 다른 각도로 한 번 더 봅니다.
 * 이 파일 아래쪽이 그 보정이 실제로 작동하는지, 그리고 **작동하면 안 되는 곳에서
 * 작동하지 않는지**를 함께 지킵니다.
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

/** 보정까지 마친 뒤에도 어느 쪽으로도 갈리지 않은 축입니다 (DEC-063) */
function isUnresolved(score: { readonly directionSource: string }): boolean {
  return score.directionSource === "unresolved";
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

/**
 * 동점 보정 (DEC-063)
 *
 * **이 파일이 막으려는 사고**
 *
 * 보정은 0점일 때만 도는 규칙입니다. 조건이 흐트러지면 두 방향으로 망가집니다.
 *   - 너무 안 돌면 예전처럼 네 명 중 한 명이 균형으로 떨어집니다
 *   - 너무 잘 돌면 **아무 정보도 주지 않은 응답에 방향을 붙입니다** (DEC-053)
 *
 * 둘 다 화면만 봐서는 알 수 없어 기계가 지킵니다.
 */
describe("동점 보정 (DEC-063)", () => {
  it("콘텐츠가 보정 규칙을 선언하고 있습니다", () => {
    expect(definition.scoring.tieBreak).toEqual(["context-mean", "extreme-responses"]);
  });

  it("보정을 거치면 균형으로 남는 축이 2%를 넘지 않습니다", () => {
    // 보정 전에는 축당 약 8%, 네 축 중 하나라도 균형인 사람이 약 28%였습니다.
    const TRIALS = 3000;
    const random = makeRandom(20260827);
    let unresolvedAxes = 0;
    let anyUnresolved = 0;

    for (let trial = 0; trial < TRIALS; trial += 1) {
      const scores = scoreWith(() => 1 + Math.floor(random() * 5));
      const unresolved = scores.filter(isUnresolved).length;

      unresolvedAxes += unresolved;
      if (unresolved > 0) anyUnresolved += 1;
    }

    const perAxisRate = unresolvedAxes / (TRIALS * definition.axes.length);
    const anyRate = anyUnresolved / TRIALS;

    expect(perAxisRate, `축당 균형 ${(perAxisRate * 100).toFixed(2)}%`).toBeLessThan(0.02);
    expect(anyRate, `한 축이라도 균형 ${(anyRate * 100).toFixed(2)}%`).toBeLessThan(0.05);
  });

  it("보정은 rawScore를 바꾸지 않습니다 — 밸런스 지도 마커는 정중앙 그대로입니다", () => {
    const random = makeRandom(1234);
    for (let trial = 0; trial < 200; trial += 1) {
      const scores = scoreWith(() => 1 + Math.floor(random() * 5));
      for (const score of scores) {
        if (score.directionSource !== "tiebreak") continue;
        expect(score.rawScore, String(score.axisId)).toBe(0);
        expect(score.isBalanced, String(score.axisId)).toBe(true);
      }
    }
  });

  it("모든 문항에 같은 값을 찍으면 보정을 걸지 않습니다 (DEC-053)", () => {
    /*
      정·역 문항이 상쇄되어 반드시 0점이 되는 응답입니다. 장면마다 정·역 문항 수가 다르면
      장면 보정이 **여기서도 방향을 만들어 냅니다.** 답을 고르지 않은 사람에게 성향을
      붙이는 셈이라, 응답이 갈리지 않은 축에는 보정을 걸지 않습니다.
    */
    for (const value of [1, 2, 3, 4, 5]) {
      const scores = scoreWith(() => value);
      for (const score of scores) {
        expect(score.rawScore, `전부 ${value}점 · ${String(score.axisId)}`).toBe(0);
        expect(isUnresolved(score), `전부 ${value}점 · ${String(score.axisId)}`).toBe(true);
      }
    }
  });

  it("보정이 방향을 찾은 축은 근거가 될 규칙 id를 함께 남깁니다", () => {
    const random = makeRandom(99);
    let seen = 0;

    for (let trial = 0; trial < 600 && seen === 0; trial += 1) {
      for (const score of scoreWith(() => 1 + Math.floor(random() * 5))) {
        if (score.directionSource !== "tiebreak") continue;
        seen += 1;
        expect(definition.scoring.tieBreak).toContain(score.tieBreakRuleId);
      }
    }

    // 0점 자체가 축당 8%라, 600회면 보정 사례가 반드시 나옵니다.
    expect(seen, "보정 사례를 한 건도 만나지 못했습니다").toBeGreaterThan(0);
  });

  it("보정 규칙을 선언하지 않은 검사는 예전처럼 동작합니다 (AGENTS.md 7절)", () => {
    const withoutTieBreak = {
      ...definition,
      scoring: { ...definition.scoring, tieBreak: undefined },
    };

    const responses = definition.questions.map((question) => ({
      sessionId: probeSessionId,
      questionId: toQuestionId(String(question.id)),
      // 축마다 반드시 0점을 만드는 응답: 정방향 5점 · 역방향 5점
      value: 5,
      answeredAt: "2026-08-27T00:00:00.000Z",
    }));

    const result = scoreAssessment(withoutTieBreak, responses);
    if (!result.ok) throw new Error(result.error.code);

    for (const score of result.value.axisScores) {
      expect(score.rawScore).toBe(0);
      expect(score.directionSource).toBe("unresolved");
    }
  });
});
