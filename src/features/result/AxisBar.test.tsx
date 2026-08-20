import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AxisBar } from "@/features/result/AxisBar";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function loadAxis() {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사를 불러오지 못했습니다.");
  const axis = found.value.axes[0];
  if (axis === undefined) throw new Error("축이 없습니다.");
  return axis;
}

function score(rawScore: number, intensityBandId: string): AxisScore {
  return {
    axisId: loadAxis().id,
    rawScore,
    minScore: -20,
    maxScore: 20,
    normalized: (rawScore + 20) / 40,
    direction: rawScore < 0 ? "negative" : "positive",
    isBalanced: rawScore === 0,
    intensityBandId,
  };
}

describe("축 막대의 균형·강도 표현", () => {
  it("균형 구간에서는 rawScore 부호가 있어도 한쪽 방향을 배지에 쓰지 않습니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(-3, "balanced")} />,
    );

    expect(markup).toContain(">균형<");
    expect(markup).not.toContain("쪽 · 균형");
    expect(markup).toContain("현재 점수로 어느 한쪽을 단정하기 어려운 균형 구간입니다");
  });

  it("방향 구간에서는 방향과 강도를 함께 읽습니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(-8, "clear")} />,
    );

    expect(markup).toContain("혼자 있을 때 채워지는 몰입형 쪽 · 뚜렷");
  });
});
