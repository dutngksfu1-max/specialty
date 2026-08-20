import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AssessmentMapPanel } from "@/features/assessment-intro/AssessmentExplainer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

describe("AssessmentMapPanel", () => {
  it("검사별 판단 기준을 한 개의 다섯 행 기준표로 표시합니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    const presentation = staticAssessmentCatalog.findPresentationBySlug("teacher-style");
    if (!found.ok || presentation?.responseScaleGuide === undefined) {
      throw new Error("검사 소개 기준표 데이터가 없습니다.");
    }

    const html = renderToStaticMarkup(
      <AssessmentMapPanel
        axes={found.value.axes}
        options={found.value.scale.options}
        responseScaleGuide={presentation.responseScaleGuide}
      />,
    );

    expect(html).toContain("판단 기준");
    expect(html.match(/<li/g)).toHaveLength(9);

    for (const tone of ["energy", "lens", "decision", "rhythm"]) {
      expect(html).toContain(`assessment-perspective-card--${tone}`);
    }
    expect([...html.matchAll(/data-perspective-tone="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "energy",
      "lens",
      "decision",
      "rhythm",
    ]);

    for (const item of presentation.responseScaleGuide) {
      expect(html).toContain(item.criterion);
    }
  });
});
