import { describe, expect, it } from "vitest";

import type {
  AssessmentAxis,
  IntensityBands,
  PoleSide,
  TypeCodeSpec,
} from "@/domain/assessment/model/definition";
import { buildTypeCode } from "@/domain/assessment/result/typeCode";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { toAxisId } from "@/domain/shared/ids";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 4렌즈 코드 조립 테스트 (DEC-049)
 *
 * 여기서 지키려는 것은 하나입니다 — **엔진이 글자를 모른다**는 것.
 * 그래서 이 파일의 글자는 실제 콘텐츠와 일부러 다르게 두었고,
 * 마지막 describe에서만 실제 콘텐츠 패키지의 글자를 확인합니다.
 */

const bands: IntensityBands = [
  { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 5, directional: false },
  { id: "clear", label: "뚜렷", minAbsScore: 6, maxAbsScore: 24, directional: true },
];

function axis(id: string, positiveCode: string, negativeCode: string): AssessmentAxis {
  return {
    id: toAxisId(id),
    name: `${id} 축`,
    positive: {
      side: "positive",
      label: `${id} 양극`,
      shortLabel: `${id}-플러스`,
      description: "설명",
      code: positiveCode,
      crosswalkCode: "X",
    },
    negative: {
      side: "negative",
      label: `${id} 음극`,
      shortLabel: `${id}-마이너스`,
      description: "설명",
      code: negativeCode,
      crosswalkCode: "Z",
    },
    defaultPole: "positive",
    intensityBands: bands,
  };
}

function score(id: string, rawScore: number): AxisScore {
  const direction: PoleSide = rawScore >= 0 ? "positive" : "negative";
  return {
    axisId: toAxisId(id),
    rawScore,
    minScore: -24,
    maxScore: 24,
    normalized: (rawScore + 24) / 48,
    direction,
    isBalanced: rawScore === 0,
    intensityBandId: "clear",
  };
}

const spec: TypeCodeSpec = {
  label: "테스트 코드",
  balancedLetter: "·",
  balancedNote: "이 자리는 균형입니다.",
  crosswalk: {
    systemLabel: "다른 검사",
    selfReportedLabel: "직접 입력",
    selfReportedInputLabel: "내 코드",
    disclaimer: "근사입니다.",
    unavailableNote: "환산하지 않았습니다.",
  },
};

const twoAxes = [axis("a", "P", "Q"), axis("b", "R", "S")];
const none = new Set<AxisId>();

describe("buildTypeCode", () => {
  it("축 순서대로 극 글자를 이어 붙입니다", () => {
    const result = buildTypeCode(twoAxes, [score("a", 12), score("b", -12)], none, spec);

    expect(result?.code).toBe("PS");
    expect(result?.hasBalancedSlot).toBe(false);
  });

  it("자리마다 어느 극인지 함께 돌려줍니다 — 글자만 크게 띄우지 않기 위해서입니다", () => {
    const result = buildTypeCode(twoAxes, [score("a", 12), score("b", -12)], none, spec);

    expect(result?.slots).toEqual([
      {
        axisId: toAxisId("a"),
        letter: "P",
        poleSide: "positive",
        poleLabel: "a-플러스",
        isBalanced: false,
      },
      {
        axisId: toAxisId("b"),
        letter: "S",
        poleSide: "negative",
        poleLabel: "b-마이너스",
        isBalanced: false,
      },
    ]);
  });

  it("균형 자리는 spec의 글자로 비우고, 어느 극인지 단정하지 않습니다 (DEC-046)", () => {
    const balanced = new Set([toAxisId("b")]);
    const result = buildTypeCode(twoAxes, [score("a", 12), score("b", 3)], balanced, spec);

    expect(result?.code).toBe("P·");
    expect(result?.hasBalancedSlot).toBe(true);
    expect(result?.slots[1]).toMatchObject({
      letter: "·",
      poleSide: null,
      poleLabel: null,
      isBalanced: true,
    });
  });

  it("균형 판정은 rawScore가 아니라 넘겨받은 집합을 따릅니다", () => {
    // rawScore 3은 0이 아니라 isBalanced=false지만, 균형 **구간**에는 들어갑니다.
    // 구간 판정은 resolveResultNarrative가 하므로 여기서 다시 계산하지 않습니다.
    const raw = score("b", 3);
    expect(raw.isBalanced).toBe(false);

    const result = buildTypeCode(twoAxes, [score("a", 12), raw], new Set([toAxisId("b")]), spec);
    expect(result?.slots[1]?.isBalanced).toBe(true);
  });

  it("축이 2개든 5개든 그대로 동작합니다 — 4를 하드코딩하지 않습니다 (AGENTS.md 1.3)", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => axis(id, "P", "Q"));
    const result = buildTypeCode(
      five,
      five.map((item) => score(String(item.id), 10)),
      none,
      spec,
    );

    expect(result?.code).toBe("PPPPP");
    expect(result?.slots).toHaveLength(5);
  });
});

describe("buildTypeCode — 코드를 만들지 않는 경우", () => {
  it("spec이 없으면 null입니다. 코드 표기를 원하지 않는 검사도 있습니다", () => {
    expect(buildTypeCode(twoAxes, [score("a", 12), score("b", -12)], none, undefined)).toBeNull();
  });

  it("극에 code가 없으면 null입니다. 반쪽짜리 코드를 만들지 않습니다", () => {
    const noCode: AssessmentAxis = {
      ...twoAxes[0]!,
      positive: { ...twoAxes[0]!.positive, code: undefined },
    };

    expect(buildTypeCode([noCode], [score("a", 12)], none, spec)).toBeNull();
  });

  it("축과 점수가 어긋나면 null입니다. 틀린 코드보다 없는 코드가 낫습니다", () => {
    expect(buildTypeCode(twoAxes, [score("a", 12)], none, spec)).toBeNull();
  });
});

describe("buildTypeCode — 환산 코드", () => {
  it("모든 자리가 방향을 가질 때만 환산합니다", () => {
    const result = buildTypeCode(twoAxes, [score("a", 12), score("b", -12)], none, spec);
    expect(result?.crosswalkCode).toBe("XZ");
  });

  it("균형 자리가 하나라도 있으면 환산하지 않습니다 (DEC-046)", () => {
    const result = buildTypeCode(
      twoAxes,
      [score("a", 12), score("b", 3)],
      new Set([toAxisId("b")]),
      spec,
    );
    expect(result?.crosswalkCode).toBeNull();
  });

  it("콘텐츠가 crosswalk 규격을 주지 않으면 환산하지 않습니다", () => {
    const withoutCrosswalk: TypeCodeSpec = { ...spec, crosswalk: undefined };
    const result = buildTypeCode(
      twoAxes,
      [score("a", 12), score("b", -12)],
      none,
      withoutCrosswalk,
    );

    expect(result?.code).toBe("PS");
    expect(result?.crosswalkCode).toBeNull();
  });
});
