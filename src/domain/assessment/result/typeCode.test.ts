import { describe, expect, it } from "vitest";

import type { AssessmentAxis, TypeCodeSpec } from "@/domain/assessment/model/definition";
import { buildTypeCode } from "@/domain/assessment/result/typeCode";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { toAxisId } from "@/domain/shared/ids";

const bands = [{ id: "leaning", label: "근소한 차이", minAbsScore: 0, maxAbsScore: 20 }] as const;

const axes: readonly AssessmentAxis[] = [
  {
    id: toAxisId("a"),
    name: "첫 관점",
    positive: { side: "positive", label: "첫 정방향", shortLabel: "정방향", description: "설명", code: "A", crosswalkCode: "X" },
    negative: { side: "negative", label: "첫 역방향", shortLabel: "역방향", description: "설명", code: "B", crosswalkCode: "Y" },
    defaultPole: "positive",
    intensityBands: bands,
  },
  {
    id: toAxisId("b"),
    name: "둘째 관점",
    positive: { side: "positive", label: "둘째 정방향", shortLabel: "정방향", description: "설명", code: "C", crosswalkCode: "Z" },
    negative: { side: "negative", label: "둘째 역방향", shortLabel: "역방향", description: "설명", code: "D", crosswalkCode: "Q" },
    defaultPole: "negative",
    intensityBands: bands,
  },
];

const spec: TypeCodeSpec = {
  label: "검사 코드",
  crosswalk: {
    systemLabel: "환산 코드",
    selfReportedLabel: "입력 코드",
    selfReportedInputLabel: "내 코드",
    disclaimer: "근사 표기입니다.",
    unavailableNote: "환산할 수 없습니다.",
  },
};

function score(axisId: string, direction: "positive" | "negative", rawScore = 8): AxisScore {
  return {
    axisId: toAxisId(axisId),
    rawScore,
    minScore: -20,
    maxScore: 20,
    normalized: (rawScore + 20) / 40,
    direction,
    directionSource: rawScore === 0 ? "default" : "score",
    intensityBandId: "leaning",
  };
}

describe("유형 코드 조립 (DEC-068)", () => {
  it("축 방향마다 글자 하나를 이어 붙입니다", () => {
    const result = buildTypeCode(axes, [score("a", "positive"), score("b", "negative", -8)], spec);

    expect(result?.code).toBe("AD");
    expect(result?.slots).toEqual([
      { axisId: toAxisId("a"), letter: "A", poleSide: "positive", poleLabel: "정방향" },
      { axisId: toAxisId("b"), letter: "D", poleSide: "negative", poleLabel: "역방향" },
    ]);
    expect(result?.crosswalkCode).toBe("XQ");
  });

  it("원점수가 같아도 채점이 정한 방향의 글자 하나를 사용합니다", () => {
    const result = buildTypeCode(axes, [score("a", "positive", 0), score("b", "negative", 0)], spec);

    expect(result?.code).toBe("AD");
    expect(result?.slots.every((slot) => slot.letter.length === 1)).toBe(true);
  });

  it("규격이나 축이 없으면 코드를 만들지 않습니다", () => {
    expect(buildTypeCode(axes, [score("a", "positive"), score("b", "positive")], undefined)).toBeNull();
    expect(buildTypeCode([], [], spec)).toBeNull();
  });

  it("축 점수나 극 글자가 빠지면 반쪽짜리 코드를 만들지 않습니다", () => {
    expect(buildTypeCode(axes, [score("a", "positive")], spec)).toBeNull();

    const withoutCode: readonly AssessmentAxis[] = [
      { ...axes[0]!, positive: { ...axes[0]!.positive, code: undefined } },
      axes[1]!,
    ];
    expect(buildTypeCode(withoutCode, [score("a", "positive"), score("b", "positive")], spec)).toBeNull();
  });

  it("환산 글자가 하나라도 빠지면 주 코드는 유지하고 환산만 생략합니다", () => {
    const withoutCrosswalk: readonly AssessmentAxis[] = [
      { ...axes[0]!, positive: { ...axes[0]!.positive, crosswalkCode: undefined } },
      axes[1]!,
    ];
    const result = buildTypeCode(
      withoutCrosswalk,
      [score("a", "positive"), score("b", "positive")],
      spec,
    );

    expect(result?.code).toBe("AC");
    expect(result?.crosswalkCode).toBeNull();
  });
});
