import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function renderResult(): { readonly markup: string; readonly profile: ReturnType<typeof getProfile> } {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");

  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("테스트용 결과 프로필이 없습니다.");

  const snapshot = {
    score: {
      resultKey: profile.key,
      axisScores: found.value.axes.map((axis) => ({
        axisId: axis.id,
        rawScore: 8,
        minScore: -20,
        maxScore: 20,
        normalized: 0.7,
        direction: "positive" as const,
        isBalanced: false,
        intensityBandId: "clear",
      })),
    },
  } as unknown as ResultSnapshot;

  return {
    markup: renderToStaticMarkup(
      <ResultRenderer
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        nickname="테스트 선생님"
      />,
    ),
    profile,
  };
}

function getProfile() {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");
  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("테스트용 결과 프로필이 없습니다.");
  return profile;
}

describe("결과 페이지 정보 구조", () => {
  it("첫 설명과 긴 교직 리듬을 같은 결과 헤더에서 연속해 읽습니다", () => {
    const { markup, profile } = renderResult();

    const headerEnd = markup.indexOf("결과 순서");
    expect(markup.indexOf(profile.oneLiner)).toBeGreaterThan(-1);
    expect(markup.indexOf(profile.rhythm)).toBeGreaterThan(markup.indexOf(profile.oneLiner));
    expect(markup.indexOf(profile.rhythm)).toBeLessThan(headerEnd);
  });

  it("결과의 네 장과 내부 바로가기가 서로 연결됩니다", () => {
    const { markup } = renderResult();

    for (const id of ["result-overview", "result-scenes", "result-collaboration", "result-next"]) {
      expect(markup).toContain(`href="#${id}"`);
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("고정된 결과 콘텐츠 순서를 유지합니다", () => {
    const { markup } = renderResult();
    const headings = [
      "한눈에 보는 나",
      "교실에서 빛나는 순간",
      "바쁠 때 나타날 수 있는 모습",
      "동료와 함께 일할 때",
      "호흡이 자연스러운 스타일",
      "조율하면 더 편한 스타일",
      "내일 해 볼 것",
      "동료와 나눌 질문",
    ];

    const positions = headings.map((heading) => markup.lastIndexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
