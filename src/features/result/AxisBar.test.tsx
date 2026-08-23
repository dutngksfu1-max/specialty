import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AxisBar, visualMarkerPercent } from "@/features/result/AxisBar";
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
    minScore: -24,
    maxScore: 24,
    normalized: (rawScore + 24) / 48,
    direction: rawScore < 0 ? "negative" : "positive",
    isBalanced: rawScore === 0,
    intensityBandId,
  };
}

describe("축 막대의 균형·강도 표현", () => {
  it("중앙 근처의 작은 점수 차이도 막대에서 분명히 구분합니다", () => {
    const one = visualMarkerPercent(score(1, "leaning"));
    const two = visualMarkerPercent(score(2, "leaning"));
    const three = visualMarkerPercent(score(3, "leaning"));

    expect(one).toBeGreaterThan(55);
    expect(two - one).toBeGreaterThan(3);
    expect(three - two).toBeGreaterThan(3);
  });

  it("중앙과 양 끝의 기준 위치는 바꾸지 않습니다", () => {
    expect(visualMarkerPercent(score(-24, "very-clear"))).toBe(0);
    expect(visualMarkerPercent(score(0, "balanced"))).toBe(50);
    expect(visualMarkerPercent(score(24, "very-clear"))).toBe(100);
  });

  it("균형 구간에서도 점수가 향한 교직 스타일을 표시합니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar
        axis={loadAxis()}
        score={score(-3, "defining")}
        intensityBandId="balanced"
      />,
    );

    expect(markup).toContain("몰입형 · 균형");
    expect(markup).not.toContain("조금 가까움");
    expect(markup).toContain("혼자 정리하는 몰입형 방향의 균형 구간");
    expect(markup).toContain("result-axis-center");
  });

  it("정확히 0점이면 어느 쪽으로도 기울이지 않습니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(0, "defining")} intensityBandId="balanced" />,
    );

    expect(markup).toContain("0 · 균형");
    expect(markup).not.toContain("쪽에 조금 가까움");
    expect(markup).toContain("두 방향의 점수가 같은 균형 구간");
  });

  it("방향 구간에서는 방향과 강도를 함께 읽습니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(-8, "balanced")} intensityBandId="clear" />,
    );

    expect(markup).toContain("혼자 정리하는 몰입형 쪽, 뚜렷");
  });

  it("저장된 구간값 대신 읽는 시점에 다시 계산한 구간을 씁니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(8, "defining")} intensityBandId="leaning" />,
    );

    expect(markup).toContain("조금 뚜렷");
    expect(markup).not.toContain("매우 뚜렷");
  });
});
