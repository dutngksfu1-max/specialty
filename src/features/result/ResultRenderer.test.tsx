import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AssessmentSignals } from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function renderResult(signals?: AssessmentSignals): {
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
        minScore: -24,
        maxScore: 24,
        normalized: 2 / 3,
        direction: "positive" as const,
        isBalanced: false,
        intensityBandId: "defining",
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
        signals={signals}
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
        minScore: -24,
        maxScore: 24,
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
    expect(markup).toContain("검사 결과 · 테스트 선생님");
    expect(markup).not.toContain("테스트 선생님 님");
  });

  it("결과의 네 장과 내부 바로가기가 서로 연결됩니다", () => {
    const { markup } = renderResult();

    for (const id of ["result-overview", "result-scenes", "result-collaboration", "result-next"]) {
      expect(markup).toContain(`href="#${id}"`);
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("균형 구간이 있어도 산출된 교직 스타일을 끝까지 전달합니다", () => {
    const markup = renderBalancedResult();

    expect(markup).toContain("함께 정하고 꼼꼼히 준비하는 교실");
    expect(markup).not.toContain("결과를 나타내는 상징");
    expect(markup).toContain("두 방식 가운데 어느 쪽을 선택했는지 실제 장면");
    expect(markup).toContain("균형으로 나온 관점 하나를 골라");
    expect(markup).not.toContain("몰입형과는,");
  });

  it("새 신호가 있으면 근거·확신도·장면 차이·응답 폭을 함께 보여 줍니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");

    const signals: AssessmentSignals = {
      consistency: found.value.axes.map((axis) => ({
        axisId: axis.id,
        variance: 0.4,
        bandId: "steady",
        questionCount: 12,
      })),
      contextSplits: [
        {
          axisId: found.value.axes[0]!.id,
          gap: 2.2,
          high: {
            context: "colleague",
            mean: 1.5,
            questionCount: 6,
            positiveCount: 3,
            negativeCount: 3,
          },
          low: {
            context: "self",
            mean: -0.7,
            questionCount: 6,
            positiveCount: 3,
            negativeCount: 3,
          },
        },
      ],
      responseStyle: {
        id: "wide",
        extremeRate: 0.25,
        middleRate: 0.125,
        answeredCount: 48,
      },
      confidence: found.value.axes.map((axis) => ({
        axisId: axis.id,
        id: "high",
        reasons: [],
      })),
    };

    const { markup } = renderResult(signals);

    expect(markup).toContain("장면에 따라 달라지는 점");
    expect(markup).toContain("동료");
    expect(markup).toContain("+1.5");
    expect(markup).toContain("6문항");
    expect(markup).toContain("확신도 높음");
    expect(markup).toContain("양 끝 선택");
    expect(markup).toContain("25%");
  });

  it("신호가 없어도 기본 결과는 온전히 보이고 빈 신호 영역은 남기지 않습니다", () => {
    const { markup, narrative } = renderResult();

    expect(markup).toContain(narrative.oneLiner);
    expect(markup).toContain("한눈에 보는 나");
    expect(markup).not.toContain("장면에 따라 달라지는 점");
    expect(markup).not.toContain("응답 폭");
  });

  it("1·2위 차이가 작으면 주축이라고 부르지 않습니다", () => {
    const { markup } = renderResult();

    expect(markup).toContain("비슷하게 도드라지는 두 관점");
    expect(markup).not.toContain(">주축<");
  });

  it("측정 범위 문구는 결과 전체에서 한 번만 표시합니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.resultNarrative === undefined) {
      throw new Error("테스트용 측정 범위 문구가 없습니다.");
    }
    const { markup } = renderResult();
    const occurrences = markup.split(found.value.resultNarrative.scopeNote).length - 1;

    expect(occurrences).toBe(1);
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
