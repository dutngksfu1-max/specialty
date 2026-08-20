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

describe("강도·균형을 반영한 결과 서술", () => {
  it("모든 축이 균형 구간이어도 산출된 종합 교직 스타일을 전달합니다", () => {
    const { definition, profile } = loadDefinition();
    const result = resolveResultNarrative(definition, scores([0, 1, -2, 4]), profile);

    expect(result.title).toBe(profile.title);
    expect(result.balancedAxisIds.size).toBe(4);
    expect(result.oneLiner).not.toContain("차이");
    expect(result.rhythm).not.toContain("차이");
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
