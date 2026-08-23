import { describe, expect, it } from "vitest";

import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function loadDefinition() {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사를 불러오지 못했습니다.");
  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("결과 프로필이 없습니다.");
  return { definition: found.value, profile };
}

function scores(rawScores: readonly number[]): readonly AxisScore[] {
  const { definition } = loadDefinition();
  return definition.axes.map((axis, index) => {
    const rawScore = rawScores[index] ?? 0;
    const absScore = Math.abs(rawScore);
    const band = axis.intensityBands.find(
      (candidate) =>
        absScore >= candidate.minAbsScore && absScore <= candidate.maxAbsScore,
    );
    if (band === undefined) throw new Error("강도 구간이 없습니다.");

    return {
      axisId: axis.id,
      rawScore,
      minScore: -20,
      maxScore: 20,
      normalized: (rawScore + 20) / 40,
      direction: rawScore < 0 ? "negative" : "positive",
      isBalanced: rawScore === 0,
      intensityBandId: band.id,
    };
  });
}

/**
 * 정확히 0점 — DEC-046
 *
 * "정확히 0점일 때에만 양쪽 점수가 같다고 설명합니다."
 *
 * `AxisScore.direction`은 0점일 때 `axis.defaultPole`이 됩니다. 그대로 쓰면
 * 기울지 않은 사람에게 "한쪽에 조금 더 가깝다"고 말하게 되므로, `isBalanced`를 봅니다.
 */
describe("정확히 0점일 때는 한쪽으로 기울여 말하지 않습니다", () => {
  function zeroScores(): readonly AxisScore[] {
    const { definition } = loadDefinition();
    return definition.axes.map((axis) => ({
      axisId: axis.id,
      rawScore: 0,
      minScore: -24,
      maxScore: 24,
      normalized: 0.5,
      direction: axis.defaultPole,
      isBalanced: true,
      intensityBandId: "balanced",
    }));
  }

  it("0점이면 balanced 방향 문구를 씁니다", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, zeroScores(), profile);

    expect(result.axes).toHaveLength(definition.axes.length);
    for (const axis of result.axes) {
      expect(axis.reading.direction, String(axis.axisId)).toBe("balanced");
    }
  });

  it("0점 문구는 한쪽에 더 가깝다고 말하지 않습니다", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, zeroScores(), profile);

    for (const axis of result.axes) {
      const joined = `${axis.reading.headline} ${axis.reading.summary} ${axis.reading.rhythm}`;
      expect(joined, String(axis.axisId)).not.toMatch(/더 가까|쪽에 가까/);
      expect(joined, String(axis.axisId)).toMatch(/비슷하게/);
    }
  });

  /**
   * DEC-052 — 1점만 기울어도 균형이 아닙니다.
   *
   * 예전에는 0~5를 균형으로 봤는데, 그 폭이 응답 잡음의 표준편차(약 4.9점)와 거의 같아
   * 무작위로 답해도 축의 73%가 균형으로 판정됐습니다. 이제 균형은 진짜 동점(0)뿐입니다.
   */
  it("1점만 기울어도 균형이 아니고 방향을 알려 줍니다 (DEC-052)", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, scores([1, -1, 1, -1]), profile);

    expect(result.balancedAxisIds.size).toBe(0);
    for (const axis of result.axes) {
      expect(axis.isDirectional, String(axis.axisId)).toBe(true);
      expect(axis.reading.direction, String(axis.axisId)).not.toBe("balanced");
    }
  });

  it("예전 균형 구간(1~5)이 이제는 전부 방향 구간입니다 (DEC-052)", () => {
    const { definition, profile } = loadDefinition();

    for (const rawScore of [1, 2, 3, 4, 5]) {
      const result = resolveResultNarrative(definition, scores([rawScore, 0, 0, 0]), profile);
      const first = result.axes[0];
      if (first === undefined) throw new Error("축 서술이 없습니다.");

      expect(first.isDirectional, `rawScore ${rawScore}`).toBe(true);
      expect(first.reading.direction, `rawScore ${rawScore}`).toBe("positive");
    }
  });
});

describe("강도·균형을 반영한 결과 서술", () => {
  it("네 축이 모두 정확히 0점이어도 산출된 종합 교직 스타일을 전달합니다", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, scores([0, 0, 0, 0]), profile);

    expect(result.title).toBe(profile.title);
    expect(result.balancedAxisIds.size).toBe(4);
    expect(result.oneLiner).not.toContain("차이");
    expect(result.rhythm).not.toContain("차이");
  });

  it("0점 축만 균형으로 셉니다 — 약하게 기운 축은 균형이 아닙니다 (DEC-052)", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, scores([0, 1, -2, 4]), profile);

    // 예전 규칙이라면 네 축 모두 균형이었습니다. 이제는 0점인 첫 축 하나뿐입니다.
    expect(result.balancedAxisIds.size).toBe(1);
    const [firstAxis] = definition.axes;
    if (firstAxis === undefined) throw new Error("축이 없습니다.");
    expect(result.balancedAxisIds.has(firstAxis.id)).toBe(true);
  });

  it("강도별 축 해석은 구분하되 핵심 카드는 종합 프로필을 유지합니다", () => {
    const { definition, profile } = loadDefinition();
    const clear = resolveResultNarrative(definition, scores([-8, 0, 0, 0]), profile);
    const strong = resolveResultNarrative(definition, scores([-16, 0, 0, 0]), profile);

    expect(clear.title).toBe(profile.title);
    expect(strong.title).toBe(profile.title);
    expect(clear.axes[0]?.reading.rhythm).not.toBe(strong.axes[0]?.reading.rhythm);
  });

  it("교직 리듬은 네 축을 종합한 세 문장 이상의 설명입니다", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, scores([-8, 9, 14, -15]), profile);

    expect(result.axes).toHaveLength(definition.axes.length);
    expect(result.rhythm.match(/\./g)?.length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * 구간 경계가 바뀐 뒤에도 예전 결과가 살아 있어야 합니다 (docs/PRD-result-v2.md 6.4)
 *
 * `intensityBandId`는 스냅샷 안에 저장됩니다. 경계가 바뀌면 그 값이 현재 구간표와
 * 맞지 않게 되는데, 이때 조용히 fallback으로 떨어지면 예전 결과가 통째로 밋밋해집니다.
 * 보존된 `rawScore`로 다시 찾으므로 그런 일이 없어야 합니다.
 */
describe("저장된 구간 id가 낡아도 결과가 살아 있습니다", () => {
  /** 스냅샷에 남아 있을 법한, 지금은 존재하지 않는 구간 id를 심습니다. */
  function withStaleBandIds(axisScores: readonly AxisScore[]): readonly AxisScore[] {
    return axisScores.map((score) => ({ ...score, intensityBandId: "구간이-사라짐" }));
  }

  it("낡은 구간 id를 무시하고 rawScore로 다시 읽습니다", () => {
    const { definition, profile } = loadDefinition();
    const fresh = resolveResultNarrative(definition, scores([-8, 9, 16, -16]), profile);
    const stale = resolveResultNarrative(
      definition,
      withStaleBandIds(scores([-8, 9, 16, -16])),
      profile,
    );

    // fallback으로 떨어졌다면 axes가 비어 있습니다.
    expect(stale.axes).toHaveLength(definition.axes.length);
    expect(stale.axes.map((axis) => axis.reading.rhythm)).toEqual(
      fresh.axes.map((axis) => axis.reading.rhythm),
    );
  });

  it("균형 판정도 저장된 값이 아니라 rawScore를 따릅니다", () => {
    const { definition, profile } = loadDefinition();
    const stale = resolveResultNarrative(definition, withStaleBandIds(scores([0, 0, 0, 0])), profile);

    expect(stale.balancedAxisIds.size).toBe(definition.axes.length);
  });
});
