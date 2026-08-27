import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AxisScore } from "@/domain/assessment/scoring/score";
import {
  AXIS_DISPLAY_LEVEL_MAX,
  AxisBar,
  axisDisplayLevel,
  visualMarkerPercent,
} from "@/features/result/AxisBar";
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
    directionSource: rawScore === 0 ? "unresolved" : "score",
    intensityBandId,
  };
}

describe("축 막대의 균형·강도 표현", () => {
  it("원점수를 -5부터 +5까지의 표시 단계로만 변환합니다", () => {
    expect(AXIS_DISPLAY_LEVEL_MAX).toBe(5);
    expect(axisDisplayLevel(score(-24, "very-clear"))).toBe(-5);
    expect(axisDisplayLevel(score(-1, "leaning"))).toBe(-1);
    expect(axisDisplayLevel(score(0, "balanced"))).toBe(0);
    expect(axisDisplayLevel(score(1, "leaning"))).toBe(1);
    expect(axisDisplayLevel(score(24, "very-clear"))).toBe(5);
  });

  it("양수 원점수를 같은 폭의 다섯 표시 구간으로 나눕니다", () => {
    const levels = [1, 4, 5, 9, 10, 14, 15, 19, 20, 24].map((raw) =>
      axisDisplayLevel(score(raw, "clear")),
    );

    expect(levels).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("표시 단계가 한 칸 오를 때마다 게이지도 같은 간격으로 움직입니다", () => {
    const levelOne = visualMarkerPercent(score(1, "leaning"));
    const levelTwo = visualMarkerPercent(score(5, "leaning"));
    const levelThree = visualMarkerPercent(score(10, "clear"));

    expect(levelOne).toBe(60);
    expect(levelTwo).toBe(70);
    expect(levelThree).toBe(80);
    expect(levelTwo - levelOne).toBe(levelThree - levelTwo);
  });

  it("중앙과 양 끝의 기준 위치는 바꾸지 않습니다", () => {
    expect(visualMarkerPercent(score(-24, "very-clear"))).toBe(0);
    expect(visualMarkerPercent(score(0, "balanced"))).toBe(50);
    expect(visualMarkerPercent(score(24, "very-clear"))).toBe(100);
  });

  it("값 배지에는 원점수 대신 표시 단계를 사용합니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(8, "clear")} intensityBandId="clear" />,
    );

    expect(markup).toContain("+2 · 교류형 · 뚜렷");
    expect(markup).toContain("기울기 단계 +2");
    expect(markup).not.toContain("축 점수 +8");
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
