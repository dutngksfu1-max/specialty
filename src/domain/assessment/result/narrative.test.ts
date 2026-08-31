import { describe, expect, it } from "vitest";

import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

const found = staticAssessmentCatalog.findBySlug("teacher-style");
if (!found.ok) throw new Error("검사를 불러오지 못했습니다.");
const definition = found.value;

function profile(key: string): ResultProfile {
  const item = definition.resultProfiles.find((candidate) => String(candidate.key) === key);
  if (item === undefined) throw new Error(`프로필이 없습니다: ${key}`);
  return item;
}

function scores(rawScores: readonly number[]): readonly AxisScore[] {
  return definition.axes.map((axis, index) => {
    const rawScore = rawScores[index] ?? 0;
    const direction = rawScore < 0 ? "negative" : axis.defaultPole;
    return {
      axisId: axis.id,
      rawScore,
      minScore: -24,
      maxScore: 24,
      normalized: (rawScore + 24) / 48,
      direction,
      directionSource: rawScore === 0 ? "default" : "score",
      intensityBandId: "stale-value",
    };
  });
}

describe("방향별 결과 서술 (DEC-068)", () => {
  it("점수가 같아도 기본 방향의 문장을 사용하고 프로필 제목을 유지합니다", () => {
    const selected = profile("pppp");
    const result = resolveResultNarrative(definition, scores([0, 0, 0, 0]), selected);

    expect(result.title).toBe(selected.title);
    expect(result.axes).toHaveLength(definition.axes.length);
    expect(result.axes.every((axis) => axis.direction === "positive")).toBe(true);
    expect(result.axes.every((axis) => axis.reading.direction === "positive")).toBe(true);
  });

  it("같은 방향이면 점수 차이와 관계없이 같은 설명을 사용합니다", () => {
    const selected = profile("pppp");
    const slight = resolveResultNarrative(definition, scores([1, 1, 1, 1]), selected);
    const strong = resolveResultNarrative(definition, scores([24, 24, 24, 24]), selected);

    expect(slight.axes.map((axis) => axis.reading)).toEqual(
      strong.axes.map((axis) => axis.reading),
    );
    expect(slight.axes.map((axis) => axis.intensityBandId)).not.toEqual(
      strong.axes.map((axis) => axis.intensityBandId),
    );
  });

  it("반대 방향이면 반대 방향의 설명을 사용합니다", () => {
    const selected = profile("nnnn");
    const result = resolveResultNarrative(definition, scores([-8, -8, -8, -8]), selected);

    expect(result.axes.every((axis) => axis.direction === "negative")).toBe(true);
    expect(result.axes.every((axis) => axis.reading.direction === "negative")).toBe(true);
  });

  it("저장된 구간 id 대신 현재 원점수로 게이지 구간을 다시 계산합니다", () => {
    const result = resolveResultNarrative(definition, scores([1, 8, 14, 24]), profile("pppp"));

    expect(result.axes.map((axis) => axis.intensityBandId)).toEqual([
      "leaning",
      "clear",
      "strong",
      "defining",
    ]);
  });

  it("결과 서술 규격이 없으면 프로필 문구로 안전하게 되돌아갑니다", () => {
    const selected = profile("pppp");
    const result = resolveResultNarrative(
      { ...definition, resultNarrative: undefined },
      scores([8, 8, 8, 8]),
      selected,
    );

    expect(result).toEqual({
      title: selected.title,
      oneLiner: selected.oneLiner,
      rhythm: selected.rhythm,
      axes: [],
    });
  });
});
