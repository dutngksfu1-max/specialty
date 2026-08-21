import { describe, expect, it } from "vitest";

import { emphasizeText } from "@/domain/assessment/result/emphasis";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

/**
 * 본문 강조
 *
 * 여기서 지키는 것은 "강조가 강조로 남는다"입니다.
 * 한 문장을 여러 군데 칠하면 어디가 중요한지 사라집니다.
 */

const TERMS = ["혼자 정리하는", "혼자", "미리 정해 두"] as const;

describe("강조 구간 나누기", () => {
  it("핵심 어구만 강조하고 나머지는 그대로 둡니다", () => {
    const segments = emphasizeText("두 방식을 함께 쓰지만, 혼자 정리하는 쪽에 조금 더 가까워요.", TERMS);

    expect(segments.map((segment) => segment.text).join("")).toBe(
      "두 방식을 함께 쓰지만, 혼자 정리하는 쪽에 조금 더 가까워요.",
    );
    expect(segments.filter((segment) => segment.emphasized).map((segment) => segment.text)).toEqual([
      "혼자 정리하는",
    ]);
  });

  it("긴 어구가 짧은 어구를 이깁니다", () => {
    // "혼자"가 먼저 잡히면 "혼자 정리하는"이 쪼개집니다.
    const segments = emphasizeText("혼자 정리하는 편이에요.", TERMS);
    const marked = segments.filter((segment) => segment.emphasized).map((segment) => segment.text);

    expect(marked).toEqual(["혼자 정리하는"]);
  });

  it("한 문장에 두 개까지만 강조합니다", () => {
    const text = "혼자 정리하는 편이고, 혼자 있을 때도 혼자 정리하는 쪽이에요.";
    const marked = emphasizeText(text, TERMS).filter((segment) => segment.emphasized);

    expect(marked.length).toBeLessThanOrEqual(2);
  });

  it("강조 개수를 0으로 두면 아무것도 칠하지 않습니다", () => {
    const segments = emphasizeText("혼자 정리하는 편이에요.", TERMS, 0);

    expect(segments).toEqual([{ text: "혼자 정리하는 편이에요.", emphasized: false }]);
  });

  it("해당하는 어구가 없으면 통째로 한 조각입니다", () => {
    const segments = emphasizeText("오늘은 비가 옵니다.", TERMS);

    expect(segments).toEqual([{ text: "오늘은 비가 옵니다.", emphasized: false }]);
  });

  it("빈 문자열과 빈 목록을 안전하게 다룹니다", () => {
    expect(emphasizeText("", TERMS)).toEqual([]);
    expect(emphasizeText("문장", [])).toEqual([{ text: "문장", emphasized: false }]);
  });

  it("같은 입력이면 항상 같은 출력입니다 (순수 함수)", () => {
    const text = "혼자 정리하는 편이고 미리 정해 두는 쪽이에요.";
    expect(emphasizeText(text, TERMS)).toEqual(emphasizeText(text, TERMS));
  });
});

describe("실제 콘텐츠에 강조가 실제로 걸립니다", () => {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok || found.value.resultNarrative === undefined) {
    throw new Error("검사를 불러오지 못했습니다.");
  }
  const narrative = found.value.resultNarrative;

  it("등록한 강조 어구가 모두 본문에 실제로 쓰입니다", () => {
    // 쓰이지 않는 어구가 쌓이면 목록이 관리되지 않고 있다는 뜻입니다.
    const body = narrative.axes
      .flatMap((axis) => axis.readings.flatMap((r) => [r.headline, r.summary, r.rhythm]))
      .join(" ");

    for (const term of narrative.emphasisTerms) {
      expect(body, `쓰이지 않는 강조 어구: ${term}`).toContain(term);
    }
  });

  it("방향이 정해진 축 서술은 강조할 곳이 있습니다", () => {
    for (const axis of narrative.axes) {
      for (const reading of axis.readings) {
        if (reading.direction === "balanced") continue;

        const marked = emphasizeText(reading.summary, narrative.emphasisTerms).filter(
          (segment) => segment.emphasized,
        );
        expect(
          marked.length,
          `${String(axis.axisId)}/${reading.intensityBandId}/${reading.direction}: ${reading.summary}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
