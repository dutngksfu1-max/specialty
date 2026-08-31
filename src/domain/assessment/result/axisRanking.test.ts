import { describe, expect, it } from "vitest";

import { resolveAxisRanking } from "@/domain/assessment/result/axisRanking";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { buildDefinition } from "@/test/assessmentBuilder";

/**
 * 축 순위 — 무게중심 (docs/PRD-result-v2.md 4.5)
 *
 * 여기서 지키는 것은 "비슷한 걸 다르다고 말하지 않는다"입니다.
 */

const definition = buildDefinition({
  axes: [
    { id: "axis-a", polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1] },
    { id: "axis-b", polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1] },
    { id: "axis-c", polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1] },
    { id: "axis-d", polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1] },
  ],
});

/** 축당 12문항 × 최대 편차 2 = ±24 */
function scoresOf(rawScores: readonly number[]): readonly AxisScore[] {
  return definition.axes.map((axis, index) => ({
    axisId: axis.id,
    rawScore: rawScores[index] ?? 0,
    minScore: -24,
    maxScore: 24,
    normalized: ((rawScores[index] ?? 0) + 24) / 48,
    direction: (rawScores[index] ?? 0) < 0 ? "negative" : "positive",
      directionSource: (rawScores[index] ?? 0) === 0 ? "default" : "score",
    intensityBandId: "clear",
  }));
}

describe("축 순위", () => {
  it("기울기가 큰 순서로 정렬합니다 (방향은 보지 않습니다)", () => {
    // -20이 +12보다 더 크게 기운 것입니다.
    const ranking = resolveAxisRanking(definition.axes, scoresOf([12, -20, 4, 0]));

    expect(ranking.ordered.map((item) => String(item.axisId))).toEqual([
      "axis-b",
      "axis-a",
      "axis-c",
      "axis-d",
    ]);
  });

  it("1·2위가 충분히 벌어지면 주축과 부축을 정합니다", () => {
    // 24와 6 → 차이 18, 기준(24 × 0.125 = 3) 이상
    const ranking = resolveAxisRanking(definition.axes, scoresOf([24, 6, 2, 0]));

    expect(ranking.isTied).toBe(false);
    expect(String(ranking.primary?.axisId)).toBe("axis-a");
    expect(String(ranking.secondary?.axisId)).toBe("axis-b");
  });

  /** 이 검사가 핵심입니다 — 비슷한 둘 중 하나를 임의로 앞세우면 안 됩니다. */
  it("1·2위가 비슷하면 주축을 정하지 않습니다", () => {
    // 12와 10 → 차이 2, 기준 3에 못 미침
    const ranking = resolveAxisRanking(definition.axes, scoresOf([12, 10, 2, 0]));

    expect(ranking.isTied).toBe(true);
    expect(ranking.primary).toBeUndefined();
    expect(ranking.secondary).toBeUndefined();
  });

  it("모든 축이 같으면 주축을 정하지 않습니다", () => {
    const ranking = resolveAxisRanking(definition.axes, scoresOf([8, 8, 8, 8]));

    expect(ranking.isTied).toBe(true);
    expect(ranking.ordered).toHaveLength(4);
  });

  it("동점이면 축 정의 순서를 따릅니다 (순서가 흔들리지 않습니다)", () => {
    const first = resolveAxisRanking(definition.axes, scoresOf([10, 10, 10, 10]));
    const second = resolveAxisRanking(definition.axes, scoresOf([10, 10, 10, 10]));

    expect(first.ordered.map((item) => String(item.axisId))).toEqual(
      second.ordered.map((item) => String(item.axisId)),
    );
    expect(first.ordered.map((item) => String(item.axisId))).toEqual([
      "axis-a",
      "axis-b",
      "axis-c",
      "axis-d",
    ]);
  });
});
