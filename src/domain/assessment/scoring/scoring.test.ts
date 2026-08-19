import { describe, expect, it } from "vitest";

import {
  centerResponse,
  resolveIntensity,
  resolveResultKey,
  scoreAssessment,
} from "@/domain/assessment/scoring/scoring";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { toAxisId, toQuestionId } from "@/domain/shared/ids";
import {
  buildDefinition,
  respond,
  standardBands,
  type AxisSpec,
} from "@/test/assessmentBuilder";

/**
 * docs/architecture.md 5.3의 계산 예시를 그대로 옮긴 테스트입니다.
 * 축 하나 = 10문항, polarity 앞 5개 +1 / 뒤 5개 -1 구성입니다.
 */
const halfAndHalf: AxisSpec = {
  id: "axis-a",
  polarities: [1, 1, 1, 1, 1, -1, -1, -1, -1, -1],
};

const singleAxisDefinition = buildDefinition({ axes: [halfAndHalf] });

/** 축이 하나뿐인 정의에서 그 축의 점수를 꺼냅니다. */
function scoreOnly(
  values: readonly number[],
  axes: readonly AxisSpec[] = [halfAndHalf],
): AxisScore {
  const definition = buildDefinition({ axes });
  const axisId = axes[0]?.id ?? "axis-a";
  const result = scoreAssessment(definition, respond(definition, { [axisId]: values }));

  if (!result.ok) {
    throw new Error(`채점이 실패했습니다: ${result.error.code} ${result.error.detail ?? ""}`);
  }

  const axisScore = result.value.axisScores[0];
  if (axisScore === undefined) {
    throw new Error("축 점수가 없습니다.");
  }
  return axisScore;
}

describe("centerResponse", () => {
  it("5점 척도(중앙값 3)에서 1~5를 -2~+2로 옮깁니다", () => {
    expect([1, 2, 3, 4, 5].map((value) => centerResponse(value, 3))).toEqual([-2, -1, 0, 1, 2]);
  });

  it("7점 척도(중앙값 4)에서는 -3~+3이 됩니다 — 척도 점수를 코드가 정하지 않습니다", () => {
    expect([1, 4, 7].map((value) => centerResponse(value, 4))).toEqual([-3, 0, 3]);
  });
});

describe("architecture.md 5.3 검증 예시", () => {
  it("예시 A — rawScore +14, 매우 뚜렷, positive", () => {
    const axisScore = scoreOnly([5, 4, 5, 4, 4, 2, 1, 2, 2, 1]);

    expect(axisScore.rawScore).toBe(14);
    expect(axisScore.minScore).toBe(-20);
    expect(axisScore.maxScore).toBe(20);
    expect(axisScore.intensityBandId).toBe("strong");
    expect(axisScore.direction).toBe("positive");
    expect(axisScore.isBalanced).toBe(false);
    expect(axisScore.normalized).toBeCloseTo(0.85, 10);
  });

  it("예시 B — rawScore -12, 뚜렷, negative", () => {
    const axisScore = scoreOnly([2, 2, 3, 2, 1, 4, 5, 4, 4, 5]);

    expect(axisScore.rawScore).toBe(-12);
    expect(axisScore.intensityBandId).toBe("clear");
    expect(axisScore.direction).toBe("negative");
    expect(axisScore.isBalanced).toBe(false);
    expect(axisScore.normalized).toBeCloseTo(0.2, 10);
  });

  it("예시 C — rawScore 0, 균형, 방향은 defaultPole (DEC-001)", () => {
    const allPositivePolarity: AxisSpec = {
      id: "axis-a",
      polarities: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      defaultPole: "negative",
    };

    const axisScore = scoreOnly([5, 1, 4, 2, 3, 3, 4, 2, 5, 1], [allPositivePolarity]);

    expect(axisScore.rawScore).toBe(0);
    expect(axisScore.intensityBandId).toBe("balanced");
    expect(axisScore.direction).toBe("negative");
    expect(axisScore.isBalanced).toBe(true);
    expect(axisScore.normalized).toBeCloseTo(0.5, 10);
  });
});

describe("강도 구간 경계값 (DEC-002b)", () => {
  const cases = [
    { label: "0 → 균형", values: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], raw: 0, band: "balanced" },
    { label: "4 → 균형", values: [5, 5, 3, 3, 3, 3, 3, 3, 3, 3], raw: 4, band: "balanced" },
    { label: "5 → 뚜렷", values: [5, 5, 4, 3, 3, 3, 3, 3, 3, 3], raw: 5, band: "clear" },
    { label: "12 → 뚜렷", values: [5, 5, 5, 5, 5, 1, 3, 3, 3, 3], raw: 12, band: "clear" },
    { label: "13 → 매우 뚜렷", values: [5, 5, 5, 5, 5, 1, 2, 3, 3, 3], raw: 13, band: "strong" },
    { label: "20 → 매우 뚜렷", values: [5, 5, 5, 5, 5, 1, 1, 1, 1, 1], raw: 20, band: "strong" },
    { label: "-4 → 균형", values: [1, 1, 3, 3, 3, 3, 3, 3, 3, 3], raw: -4, band: "balanced" },
    { label: "-5 → 뚜렷", values: [1, 1, 2, 3, 3, 3, 3, 3, 3, 3], raw: -5, band: "clear" },
    { label: "-12 → 뚜렷", values: [1, 1, 1, 1, 1, 5, 3, 3, 3, 3], raw: -12, band: "clear" },
    { label: "-13 → 매우 뚜렷", values: [1, 1, 1, 1, 1, 5, 4, 3, 3, 3], raw: -13, band: "strong" },
    { label: "-20 → 매우 뚜렷", values: [1, 1, 1, 1, 1, 5, 5, 5, 5, 5], raw: -20, band: "strong" },
  ] as const;

  for (const testCase of cases) {
    it(testCase.label, () => {
      const axisScore = scoreOnly(testCase.values);
      expect(axisScore.rawScore).toBe(testCase.raw);
      expect(axisScore.intensityBandId).toBe(testCase.band);
    });
  }

  it("전부 3점이면 축 점수가 0이고 균형입니다 (PRD AC-3)", () => {
    const axisScore = scoreOnly([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(axisScore.rawScore).toBe(0);
    expect(axisScore.isBalanced).toBe(true);
    expect(axisScore.normalized).toBeCloseTo(0.5, 10);
  });
});

describe("resolveIntensity", () => {
  it("구간 경계는 minAbsScore 이상, maxAbsScore 이하입니다", () => {
    expect(resolveIntensity(0, standardBands).id).toBe("balanced");
    expect(resolveIntensity(4, standardBands).id).toBe("balanced");
    expect(resolveIntensity(5, standardBands).id).toBe("clear");
    expect(resolveIntensity(12, standardBands).id).toBe("clear");
    expect(resolveIntensity(13, standardBands).id).toBe("strong");
    expect(resolveIntensity(20, standardBands).id).toBe("strong");
  });
});

describe("결과 키 해석", () => {
  const fourAxes: readonly AxisSpec[] = ["axis-a", "axis-b", "axis-c", "axis-d"].map((id) => ({
    id,
    polarities: [1, 1, 1, 1, 1, -1, -1, -1, -1, -1],
  }));

  const definition = buildDefinition({ axes: fourAxes, sectionCount: 4 });

  /** 그 축을 확실히 positive / negative로 만드는 응답 */
  const toPositive = [5, 5, 5, 5, 5, 1, 1, 1, 1, 1];
  const toNegative = [1, 1, 1, 1, 1, 5, 5, 5, 5, 5];

  it("4축 16개 조합 전부 결과 프로필이 찾아집니다", () => {
    const foundKeys = new Set<string>();

    for (let mask = 0; mask < 16; mask += 1) {
      const valuesByAxis: Record<string, readonly number[]> = {};
      let expectedKey = "";

      fourAxes.forEach((axis, index) => {
        const isPositive = (mask & (1 << index)) === 0;
        valuesByAxis[axis.id] = isPositive ? toPositive : toNegative;
        expectedKey += isPositive ? "p" : "n";
      });

      const result = scoreAssessment(definition, respond(definition, valuesByAxis));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(String(result.value.resultKey)).toBe(expectedKey);
      foundKeys.add(String(result.value.resultKey));
    }

    expect(foundKeys.size).toBe(16);
  });

  it("전부 3점이면 모든 축이 defaultPole 방향으로 확정됩니다 (DEC-001)", () => {
    const mixedDefaults = buildDefinition({
      axes: [
        { id: "axis-a", polarities: [1, 1, -1, -1], defaultPole: "positive" },
        { id: "axis-b", polarities: [1, 1, -1, -1], defaultPole: "negative" },
      ],
    });

    const result = scoreAssessment(mixedDefaults, respond(mixedDefaults, {}));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.axisScores.map((axisScore) => axisScore.isBalanced)).toEqual([true, true]);
    expect(result.value.axisScores.map((axisScore) => axisScore.direction)).toEqual([
      "positive",
      "negative",
    ]);
    expect(String(result.value.resultKey)).toBe("pn");
  });

  it("맞는 프로필이 없으면 RESULT_PROFILE_NOT_FOUND", () => {
    const withoutProfiles = buildDefinition({ axes: [halfAndHalf], includeProfiles: false });
    const result = scoreAssessment(withoutProfiles, respond(withoutProfiles, {}));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("RESULT_PROFILE_NOT_FOUND");
  });

  it("resolveResultKey는 축 방향 조합만 보고 프로필을 고릅니다", () => {
    const axisScores: readonly AxisScore[] = [
      {
        axisId: toAxisId("axis-a"),
        rawScore: 7,
        minScore: -20,
        maxScore: 20,
        normalized: 0.675,
        direction: "positive",
        isBalanced: false,
        intensityBandId: "clear",
      },
    ];

    const result = resolveResultKey(axisScores, singleAxisDefinition.resultProfiles);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(String(result.value)).toBe("p");
  });
});

describe("입력 검증", () => {
  it("미응답이 있으면 INCOMPLETE_RESPONSES", () => {
    const complete = respond(singleAxisDefinition, { "axis-a": [5, 4, 5, 4, 4, 2, 1, 2, 2, 1] });
    const result = scoreAssessment(singleAxisDefinition, complete.slice(0, 9));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INCOMPLETE_RESPONSES");
  });

  it("척도에 없는 값이면 INVALID_RESPONSE", () => {
    const responses = respond(singleAxisDefinition, {}).map((response, index) =>
      index === 0 ? { ...response, value: 9 } : response,
    );
    const result = scoreAssessment(singleAxisDefinition, responses);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_RESPONSE");
  });

  it("이 검사에 없는 문항의 응답이면 INVALID_RESPONSE", () => {
    const responses = respond(singleAxisDefinition, {});
    const stray = responses[0];
    if (stray === undefined) throw new Error("응답이 비어 있습니다.");

    const result = scoreAssessment(singleAxisDefinition, [
      ...responses,
      { ...stray, questionId: toQuestionId("없는-문항") },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_RESPONSE");
  });
});

describe("순수 함수 불변 조건 (AGENTS.md 규칙 5)", () => {
  it("같은 입력은 항상 같은 결과를 냅니다", () => {
    const responses = respond(singleAxisDefinition, { "axis-a": [5, 4, 5, 4, 4, 2, 1, 2, 2, 1] });

    const first = scoreAssessment(singleAxisDefinition, responses);
    const second = scoreAssessment(singleAxisDefinition, responses);

    expect(first).toEqual(second);
  });

  it("입력을 변경하지 않습니다", () => {
    const responses = respond(singleAxisDefinition, { "axis-a": [5, 4, 5, 4, 4, 2, 1, 2, 2, 1] });
    const before = JSON.stringify(responses);
    const definitionBefore = JSON.stringify(singleAxisDefinition);

    scoreAssessment(singleAxisDefinition, responses);

    expect(JSON.stringify(responses)).toBe(before);
    expect(JSON.stringify(singleAxisDefinition)).toBe(definitionBefore);
  });

  it("응답 순서가 뒤바뀌어도 결과가 같습니다", () => {
    const responses = respond(singleAxisDefinition, { "axis-a": [5, 4, 5, 4, 4, 2, 1, 2, 2, 1] });
    const reversed = [...responses].reverse();

    expect(scoreAssessment(singleAxisDefinition, reversed)).toEqual(
      scoreAssessment(singleAxisDefinition, responses),
    );
  });
});
