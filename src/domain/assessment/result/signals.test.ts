import { describe, expect, it } from "vitest";

import { computeSignals } from "@/domain/assessment/result/signals";
import { buildDefinition, respond } from "@/test/assessmentBuilder";

/**
 * 응답 신호 (docs/PRD-result-v2.md 4장)
 *
 * 여기서 지키는 것은 "말할 수 있을 때만 말한다"입니다.
 * 근거가 얇으면 신호가 **비어 있어야** 합니다.
 */

/** 축 하나, 12문항, polarity 6:6 — 실제 검사와 같은 모양 */
const oneAxis = (contexts?: readonly string[]) =>
  buildDefinition({
    axes: [
      {
        id: "axis-a",
        polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1],
        contexts,
      },
    ],
  });

describe("S3 일관성", () => {
  it("모든 문항에 같은 방향으로 답하면 steady입니다", () => {
    const definition = oneAxis();
    // +1 문항에 5, -1 문항에 1 → aligned가 전부 +2
    const responses = respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1] });

    const [axis] = computeSignals(definition, responses).consistency;
    expect(axis?.variance).toBe(0);
    expect(axis?.bandId).toBe("steady");
    expect(axis?.questionCount).toBe(12);
  });

  it("절반씩 정반대로 답하면 split입니다", () => {
    const definition = oneAxis();
    // aligned가 +2 여섯 개, -2 여섯 개 → 분산 4 (이론적 최대)
    const responses = respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] });

    const [axis] = computeSignals(definition, responses).consistency;
    expect(axis?.variance).toBe(4);
    expect(axis?.bandId).toBe("split");
  });

  it("같은 축 점수라도 흩어짐이 다르면 다른 구간이 나옵니다", () => {
    const definition = oneAxis();
    // 두 응답 모두 rawScore 합계는 0이지만, 흩어짐이 다릅니다.
    const flat = respond(definition, { "axis-a": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] });
    const torn = respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] });

    const flatSignals = computeSignals(definition, flat).consistency[0];
    const tornSignals = computeSignals(definition, torn).consistency[0];

    expect(flatSignals?.bandId).toBe("steady");
    expect(tornSignals?.bandId).toBe("split");
  });
});

describe("S4 장면 분화", () => {
  /** 장면 둘, 각 6문항, 장면 안 polarity 3:3 — 비교 조건을 모두 채운 모양 */
  const twoScenes = [
    "scene-x", "scene-x", "scene-x", "scene-x", "scene-x", "scene-x",
    "scene-y", "scene-y", "scene-y", "scene-y", "scene-y", "scene-y",
  ] as const;

  /** polarity를 장면 안에서 3:3으로 맞춘 축 */
  const balancedAxis = buildDefinition({
    axes: [
      {
        id: "axis-a",
        polarities: [1, 1, 1, -1, -1, -1, 1, 1, 1, -1, -1, -1],
        contexts: twoScenes,
      },
    ],
  });

  it("장면에 따라 답이 갈리면 격차를 보고합니다", () => {
    // scene-x는 positive 쪽(+2), scene-y는 negative 쪽(-2)으로 답합니다.
    const responses = respond(balancedAxis, {
      "axis-a": [5, 5, 5, 1, 1, 1, 1, 1, 1, 5, 5, 5],
    });

    const [split] = computeSignals(balancedAxis, responses).contextSplits;
    expect(split).toBeDefined();
    expect(split?.high.context).toBe("scene-x");
    expect(split?.low.context).toBe("scene-y");
    expect(split?.gap).toBe(4);
    // 근거 숫자를 화면에 그대로 쓸 수 있어야 합니다.
    expect(split?.high.questionCount).toBe(6);
    expect(split?.high.positiveCount).toBe(3);
    expect(split?.high.negativeCount).toBe(3);
  });

  it("장면 차이가 기준(1.5)에 못 미치면 아무 말도 하지 않습니다", () => {
    // 두 장면 모두 같은 방향 — 격차 0
    const responses = respond(balancedAxis, {
      "axis-a": [5, 5, 5, 1, 1, 1, 5, 5, 5, 1, 1, 1],
    });

    expect(computeSignals(balancedAxis, responses).contextSplits).toEqual([]);
  });

  it("장면당 문항이 3개 미만이면 비교하지 않습니다", () => {
    const thin = buildDefinition({
      axes: [
        {
          id: "axis-a",
          polarities: [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1],
          // scene-y가 2문항뿐입니다.
          contexts: [
            "scene-x", "scene-x", "scene-x", "scene-x", "scene-x",
            "scene-x", "scene-x", "scene-x", "scene-x", "scene-x",
            "scene-y", "scene-y",
          ],
        },
      ],
    });
    const responses = respond(thin, { "axis-a": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 1, 5] });

    expect(computeSignals(thin, responses).contextSplits).toEqual([]);
  });

  /**
   * 이 검사가 이 파일에서 가장 중요합니다.
   *
   * 장면 안 polarity가 한쪽으로 몰리면, 무엇에든 "그렇다"고 답하는 습관이
   * 장면 차이처럼 보입니다. 그걸 걸러 내는지 확인합니다.
   */
  it("장면 안 polarity가 몰려 있으면 비교하지 않습니다 (묵종 편향)", () => {
    const skewed = buildDefinition({
      axes: [
        {
          id: "axis-a",
          // scene-x는 +1만 6개, scene-y는 -1만 6개
          polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1],
          contexts: twoScenes,
        },
      ],
    });
    // 무엇에든 "매우 그렇다"로 답한 사람
    const responses = respond(skewed, { "axis-a": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] });

    // scene-x 평균 +2, scene-y 평균 -2로 격차 4가 나오지만,
    // 이건 장면 차이가 아니라 응답 습관이므로 보고하지 않아야 합니다.
    expect(computeSignals(skewed, responses).contextSplits).toEqual([]);
  });
});

describe("S5 응답 폭", () => {
  const definition = oneAxis();

  it("가운데만 고르면 centered입니다", () => {
    const responses = respond(definition, { "axis-a": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] });
    const style = computeSignals(definition, responses).responseStyle;

    expect(style.id).toBe("centered");
    expect(style.middleRate).toBe(1);
    expect(style.answeredCount).toBe(12);
  });

  it("양 끝만 고르면 wide입니다", () => {
    const responses = respond(definition, { "axis-a": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1] });
    const style = computeSignals(definition, responses).responseStyle;

    expect(style.id).toBe("wide");
    expect(style.extremeRate).toBe(1);
  });

  it("가운데 쪽 값을 쓰면 moderate입니다", () => {
    const responses = respond(definition, { "axis-a": [4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2] });
    const style = computeSignals(definition, responses).responseStyle;

    expect(style.id).toBe("moderate");
    expect(style.extremeRate).toBe(0);
    expect(style.middleRate).toBe(0);
  });
});

describe("T2 확신도", () => {
  const definition = oneAxis();

  it("일관되고 폭넓게 답했으면 확신도가 높습니다", () => {
    // aligned 전부 +2 → rawScore 24(균형 아님), steady, wide
    const responses = respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1] });
    const [confidence] = computeSignals(definition, responses).confidence;

    expect(confidence?.id).toBe("high");
    expect(confidence?.reasons).toEqual([]);
  });

  it("가운데만 골랐으면 이유를 밝히고 확신도를 낮춥니다", () => {
    const responses = respond(definition, { "axis-a": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] });
    const [confidence] = computeSignals(definition, responses).confidence;

    // 균형 + 가운데 중심 → 사유 둘 → low
    expect(confidence?.id).toBe("low");
    expect(confidence?.reasons).toContain("balanced");
    expect(confidence?.reasons).toContain("centered");
  });

  it("답이 갈렸으면 사유에 split이 담깁니다", () => {
    // 모든 문항에 5 → aligned가 +2/-2로 갈림, rawScore는 0(균형)
    const responses = respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] });
    const [confidence] = computeSignals(definition, responses).confidence;

    expect(confidence?.reasons).toContain("split");
    expect(confidence?.id).toBe("low");
  });
});

describe("척도가 바뀌어도 뜻이 유지됩니다", () => {
  it("7점 척도에서도 같은 응답 모양이 같은 구간으로 읽힙니다", () => {
    const seven = buildDefinition({
      axes: [{ id: "axis-a", polarities: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1] }],
      scalePoints: 7,
    });
    // 7점 척도의 양 끝(1·7)으로 한쪽 방향에만 답 → aligned 전부 +3
    const responses = respond(seven, { "axis-a": [7, 7, 7, 7, 7, 7, 1, 1, 1, 1, 1, 1] });

    const signals = computeSignals(seven, responses);
    expect(signals.consistency[0]?.bandId).toBe("steady");
    expect(signals.responseStyle.id).toBe("wide");
  });
});

describe("자료가 모자랄 때", () => {
  it("응답이 없으면 신호를 만들지 않습니다", () => {
    const definition = oneAxis();
    const signals = computeSignals(definition, []);

    expect(signals.consistency).toEqual([]);
    expect(signals.contextSplits).toEqual([]);
    expect(signals.responseStyle.answeredCount).toBe(0);
  });

  it("같은 입력이면 항상 같은 출력입니다 (순수 함수)", () => {
    const definition = oneAxis();
    const responses = respond(definition, { "axis-a": [5, 4, 3, 2, 1, 5, 1, 2, 3, 4, 5, 1] });

    expect(computeSignals(definition, responses)).toEqual(computeSignals(definition, responses));
  });
});

/**
 * S6 응답 분화 (DEC-053)
 *
 * 축 점수는 `정방향 − 역방향`이라, 두 묶음에 같은 값을 주면 반드시 0이 됩니다.
 * 그 0을 '균형'이라고 부르면 답을 고르지 않은 사람에게 해석을 지어내게 됩니다.
 */
describe("응답 분화와 '읽기 어려움' 축 (DEC-053)", () => {
  it("모든 문항에 같은 값을 찍으면 0점이 되고, 그 축은 균형이 아니라 '읽기 어려움'입니다", () => {
    const definition = oneAxis();
    const signals = computeSignals(
      definition,
      respond(definition, { "axis-a": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] }),
    );

    expect(signals.differentiation[0]?.isDifferentiated).toBe(false);
    expect(signals.unreadableAxisIds).toHaveLength(1);
  });

  it("척도를 넓게 쓴 사람이 0점이면 진짜 대칭입니다 — '읽기 어려움'이 아닙니다", () => {
    const definition = oneAxis();
    // 정방향 6문항과 역방향 6문항에 정확히 반대로 답하면 합이 0이 아니라 최대치가 됩니다.
    // 여기서는 같은 방향 안에서 극단을 섞어 합을 0으로 만듭니다.
    const signals = computeSignals(
      definition,
      respond(definition, { "axis-a": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1] }),
    );

    expect(signals.differentiation[0]?.isDifferentiated).toBe(true);
    expect(signals.unreadableAxisIds).toHaveLength(0);
  });

  it("3과 4만 오간 응답도 분화되지 않은 것으로 봅니다", () => {
    const definition = oneAxis();
    const signals = computeSignals(
      definition,
      respond(definition, { "axis-a": [3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4] }),
    );

    expect(signals.differentiation[0]?.isDifferentiated).toBe(false);
  });

  it("방향이 이미 나온 축은 분화되지 않았어도 '읽기 어려움'이 아닙니다", () => {
    const definition = oneAxis();
    // 정방향 6문항 5점 / 역방향 6문항 1점 — 폭은 넓고 점수도 0이 아닙니다.
    const signals = computeSignals(
      definition,
      respond(definition, { "axis-a": [5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1] }),
    );

    expect(signals.unreadableAxisIds).toHaveLength(0);
  });
});
