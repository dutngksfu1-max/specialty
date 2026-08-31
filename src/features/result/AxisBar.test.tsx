import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AssessmentAxis } from "@/domain/assessment/model/definition";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AxisBar, axisDisplayLevel, visualMarkerPercent } from "@/features/result/AxisBar";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function loadAxis(): AssessmentAxis {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok || found.value.axes[0] === undefined) throw new Error("축을 불러오지 못했습니다.");
  return found.value.axes[0];
}

function score(rawScore: number, direction?: "positive" | "negative"): AxisScore {
  const resolvedDirection = direction ?? (rawScore < 0 ? "negative" : "positive");
  return {
    axisId: loadAxis().id,
    rawScore,
    minScore: -24,
    maxScore: 24,
    normalized: (rawScore + 24) / 48,
    direction: resolvedDirection,
    directionSource: rawScore === 0 ? "default" : "score",
    intensityBandId: "stale-value",
  };
}

describe("축 막대의 방향·기울기 표현", () => {
  it("원점수가 같아도 선택된 방향으로 최소 한 단계를 표시합니다", () => {
    expect(axisDisplayLevel(score(0, "positive"))).toBe(1);
    expect(axisDisplayLevel(score(0, "negative"))).toBe(-1);
    expect(visualMarkerPercent(score(0, "positive"))).toBe(60);
    expect(visualMarkerPercent(score(0, "negative"))).toBe(40);
  });

  it("기울기는 방향을 포함한 5단계로 제한합니다", () => {
    expect(axisDisplayLevel(score(1))).toBe(1);
    expect(axisDisplayLevel(score(8))).toBe(2);
    expect(axisDisplayLevel(score(24))).toBe(5);
    expect(axisDisplayLevel(score(-24))).toBe(-5);
  });

  it("방향과 구간 이름을 직설적으로 표시합니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(8)} intensityBandId="clear" />,
    );

    expect(markup).toContain("교류형 · 분명한 차이");
    expect(markup).toContain("5단계 중 2단계");
    expect(markup).not.toContain("균형");
  });

  it("원점수가 같을 때도 방향 마커와 접근성 설명이 일치합니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(0, "negative")} intensityBandId="leaning" />,
    );

    expect(markup).toContain("몰입형 · 근소한 차이");
    expect(markup).toContain("5단계 중 1단계");
    expect(markup).toContain('data-direction="negative"');
  });

  it("저장된 구간 값이 아니라 호출부가 다시 계산한 구간을 표시합니다", () => {
    const markup = renderToStaticMarkup(
      <AxisBar axis={loadAxis()} score={score(14)} intensityBandId="strong" />,
    );

    expect(markup).toContain("교류형 · 큰 차이");
    expect(markup).not.toContain("stale-value");
  });
});
