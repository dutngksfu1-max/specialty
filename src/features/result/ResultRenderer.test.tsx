import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function renderResult(): {
  readonly markup: string;
  readonly narrative: ReturnType<typeof resolveResultNarrative>;
} {
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
  const narrative = resolveResultNarrative(found.value, snapshot.score.axisScores, profile);

  return {
    markup: renderToStaticMarkup(
      <ResultRenderer
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        nickname="테스트 선생님"
      />,
    ),
    narrative,
  };
}

function renderBalancedResult(): string {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");
  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("테스트용 결과 프로필이 없습니다.");

  const snapshot = {
    score: {
      resultKey: profile.key,
      axisScores: found.value.axes.map((axis) => ({
        axisId: axis.id,
        rawScore: 0,
        minScore: -20,
        maxScore: 20,
        normalized: 0.5,
        direction: "positive" as const,
        isBalanced: true,
        intensityBandId: "balanced",
      })),
    },
  } as unknown as ResultSnapshot;

  return renderToStaticMarkup(
    <ResultRenderer
      definition={found.value}
      snapshot={snapshot}
      profile={profile}
      nickname="테스트 선생님"
    />,
  );
}

describe("결과 페이지 정보 구조", () => {
  it("첫 설명과 긴 교직 리듬을 같은 결과 헤더에서 연속해 읽습니다", () => {
    const { markup, narrative } = renderResult();

    const headerEnd = markup.indexOf("결과 순서");
    expect(markup.indexOf(narrative.oneLiner)).toBeGreaterThan(-1);
    expect(markup.indexOf(narrative.rhythm)).toBeGreaterThan(markup.indexOf(narrative.oneLiner));
    expect(markup.indexOf(narrative.rhythm)).toBeLessThan(headerEnd);
  });

  it("결과의 네 장과 내부 바로가기가 서로 연결됩니다", () => {
    const { markup } = renderResult();

    for (const id of ["result-overview", "result-scenes", "result-collaboration", "result-next"]) {
      expect(markup).toContain(`href="#${id}"`);
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("균형 구간이 있으면 고정 프로필 제목과 방향 엠블럼으로 단정하지 않습니다", () => {
    const markup = renderBalancedResult();

    expect(markup).toContain("한쪽 경향으로 단정하기 어려운 교직 리듬");
    expect(markup).toContain("균형 구간 포함");
    expect(markup).not.toContain("함께 정하고 미리 챙겨 두는 교실");
    expect(markup).not.toContain("결과를 나타내는 상징");
    expect(markup).toContain("두 방식 가운데 어느 쪽을 선택했는지 실제 장면");
    expect(markup).not.toContain("다음 주에 필요한 것을 미리 확인해");
  });

  it("고정된 결과 콘텐츠 순서를 유지합니다", () => {
    const { markup } = renderResult();
    const headings = [
      "한눈에 보는 나",
      "강점이 드러날 수 있는 장면",
      "바쁠 때 나타날 수 있는 모습",
      "동료와 함께 일할 때",
      "함께할 때 잘 이어지는 점",
      "미리 맞춰 두면 좋은 점",
      "내일 해 볼 것",
      "동료와 나눌 질문",
    ];

    const positions = headings.map((heading) => markup.lastIndexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
