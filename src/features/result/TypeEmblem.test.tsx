import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PoleSide } from "@/domain/assessment/model/definition";
import type { AxisId } from "@/domain/shared/ids";
import { TypeEmblem } from "@/features/result/TypeEmblem";

/**
 * 유형 엠블럼 가드 (DEC-039 · docs/type-emblem.md)
 *
 * 엠블럼을 교체할 때 여기서 규격 위반이 걸립니다.
 * 모양을 바꾸는 것은 자유지만, 아래 성질은 유지되어야 합니다.
 */

const AXES = ["axis-a", "axis-b", "axis-c", "axis-d"] as unknown as readonly AxisId[];

function allCombinations(): readonly Readonly<Record<AxisId, PoleSide>>[] {
  return AXES.reduce<Readonly<Record<AxisId, PoleSide>>[]>(
    (combinations, axisId) =>
      combinations.flatMap((combination) => [
        { ...combination, [axisId]: "positive" as PoleSide },
        { ...combination, [axisId]: "negative" as PoleSide },
      ]),
    [{}],
  );
}

function markup(poles: Readonly<Record<AxisId, PoleSide>>, axisIds = AXES): string {
  return renderToStaticMarkup(<TypeEmblem axisIds={axisIds} poles={poles} />);
}

describe("유형 엠블럼", () => {
  it("16종이 서로 다른 모양입니다", () => {
    const shapes = allCombinations().map((poles) => markup(poles));
    expect(shapes).toHaveLength(16);
    expect(new Set(shapes).size).toBe(16);
  });

  it("축 하나만 뒤집어도 모양이 달라집니다 (네 축이 모두 형태에 반영됨)", () => {
    const base: Record<AxisId, PoleSide> = Object.fromEntries(
      AXES.map((axisId) => [axisId, "positive"]),
    ) as Record<AxisId, PoleSide>;

    for (const axisId of AXES) {
      const flipped = { ...base, [axisId]: "negative" as PoleSide };
      expect(markup(flipped), `${String(axisId)}를 뒤집었는데 모양이 그대로입니다`).not.toBe(
        markup(base),
      );
    }
  });

  it("축 id가 아니라 순서로 매핑합니다 (다음 검사에서 깨지지 않게)", () => {
    const otherAxes = ["axis-w", "axis-x", "axis-y", "axis-z"] as unknown as readonly AxisId[];
    const poles = Object.fromEntries(
      AXES.map((axisId, index) => [axisId, index % 2 === 0 ? "positive" : "negative"]),
    ) as Record<AxisId, PoleSide>;
    const otherPoles = Object.fromEntries(
      otherAxes.map((axisId, index) => [axisId, index % 2 === 0 ? "positive" : "negative"]),
    ) as Record<AxisId, PoleSide>;

    // 이름만 다르고 순서·방향이 같으면 같은 마크가 나와야 합니다.
    expect(markup(otherPoles, otherAxes)).toBe(markup(poles));
  });

  it("유형마다 색을 다르게 주지 않습니다 (색맹 접근성)", () => {
    const colors = allCombinations().map((poles) => {
      const found = markup(poles).match(/var\(--em-[a-z]+\)/g) ?? [];
      return [...new Set(found)].sort().join(",");
    });

    // 모든 유형이 같은 색 변수 집합만 씁니다.
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).toContain("var(--em-line)");
    expect(colors[0]).toContain("var(--em-core)");
  });

  it("축이 4개가 아니어도 죽지 않습니다", () => {
    const twoAxes = ["axis-a", "axis-b"] as unknown as readonly AxisId[];
    const twoPoles = { "axis-a": "negative", "axis-b": "positive" } as unknown as Record<
      AxisId,
      PoleSide
    >;
    expect(markup(twoPoles, twoAxes)).toContain("<svg");

    // 축이 없으면 아무것도 그리지 않습니다.
    expect(markup({} as Record<AxisId, PoleSide>, [])).toBe("");
  });

  it("결과 키를 라벨에 노출하지 않습니다 (AGENTS.md 1.1)", () => {
    const poles = Object.fromEntries(AXES.map((axisId) => [axisId, "positive"])) as Record<
      AxisId,
      PoleSide
    >;
    const html = renderToStaticMarkup(
      <TypeEmblem axisIds={AXES} poles={poles} label="결과 유형을 나타내는 상징" />,
    );
    expect(html).toContain('role="img"');
    expect(html).not.toMatch(/aria-label="[pn]{4}"/);
  });

  it("장식용으로 쓰면 보조기기에서 숨깁니다", () => {
    const poles = Object.fromEntries(AXES.map((axisId) => [axisId, "positive"])) as Record<
      AxisId,
      PoleSide
    >;
    const html = renderToStaticMarkup(<TypeEmblem axisIds={AXES} poles={poles} decorative />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });
});
