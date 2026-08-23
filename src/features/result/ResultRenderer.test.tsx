import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AssessmentSignals } from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

function renderResult(
  signals?: AssessmentSignals,
  selfReportedCrosswalkCode?: string,
): {
  readonly markup: string;
  readonly narrative: ReturnType<typeof resolveResultNarrative>;
} {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");

  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("테스트용 결과 프로필이 없습니다.");

  const snapshot = {
    characterGender: "female",
    selfReportedCrosswalkCode,
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
  const presentation = staticAssessmentCatalog.findPresentationBySlug(found.value.slug);

  return {
    markup: renderToStaticMarkup(
      <ResultRenderer
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        nickname="테스트 선생님"
        signals={signals}
        presentation={presentation}
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
    characterGender: "male",
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
      presentation={staticAssessmentCatalog.findPresentationBySlug(found.value.slug)}
    />,
  );
}

describe("결과 페이지 정보 구조", () => {
  it("중복된 한 줄 설명 대신 교직 리듬을 결과 제목 가까이 한 번만 보여 줍니다", () => {
    const { markup, narrative } = renderResult();

    const headerEnd = markup.indexOf("결과 순서");
    expect(markup).not.toContain(narrative.oneLiner);
    expect(markup.split(narrative.rhythm)).toHaveLength(2);
    expect(markup.indexOf(narrative.rhythm)).toBeLessThan(headerEnd);
    expect(markup).toContain('data-result-rhythm="summary"');
    expect(markup).toContain("result-rhythm-label");
    expect(markup.split("나의 교직 리듬")).toHaveLength(2);
    expect(markup).toContain("검사 결과 · 테스트 선생님");
    expect(markup).not.toContain("테스트 선생님 님");
  });

  it("4렌즈 코드와 자리별 뜻, 유형 선화를 결과 제목 가까이에 둡니다", () => {
    const { markup } = renderResult();
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.resultProfiles[0] === undefined) {
      throw new Error("테스트용 결과 프로필을 불러오지 못했습니다.");
    }

    expect(markup).toContain("4렌즈 코드");
    expect(markup).toContain(">G<");
    expect(markup).toContain("교류형");
    expect(markup).toContain("garm-female.jpg");
    expect(markup).toContain("나를 상징하는 캐릭터");
    expect(markup).not.toContain("나의 유형을 닮은 캐릭터");
    const characterLabel = markup.match(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/)?.[0] ?? "";
    expect(characterLabel).toContain("rounded-sm");
    expect(characterLabel).toContain("bg-accent-soft");
    expect(markup.indexOf('data-result-character-label="true"')).toBeLessThan(
      markup.indexOf('data-result-character-frame="true"'),
    );
    expect(markup).toContain("minmax(18rem,0.8fr)");
    expect(markup).toContain("max-w-84");
    expect(markup).not.toContain(String(found.value.resultProfiles[0].key));
  });

  it("환산 표기가 접힘 없이 바로 보이고 근사 안내를 함께 둡니다 (DEC-057)", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.typeCode?.crosswalk === undefined) {
      throw new Error("테스트용 코드 규격을 불러오지 못했습니다.");
    }
    const { markup } = renderResult();

    // 펼치기 토글을 되살리지 않습니다.
    expect(markup).not.toContain("<details");
    expect(markup).not.toContain("result-crosswalk-chevron");
    expect(markup).toContain(found.value.typeCode.crosswalk.systemLabel);
    // 근사라는 사실을 감추지 않습니다 (DEC-049). 한 번 빠진 적이 있어 가드를 둡니다.
    expect(markup).toContain(found.value.typeCode.crosswalk.disclaimer);
  });

  it("교직 환산 코드와 사용자가 입력한 실제 코드를 같은 너비로 나란히 보여 줍니다", () => {
    const reportedCode = ["I", "N", "F", "P"].join("");
    const { markup } = renderResult(undefined, reportedCode);
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.typeCode?.crosswalk === undefined) {
      throw new Error("테스트용 코드 규격을 불러오지 못했습니다.");
    }

    expect(markup).toContain("grid-cols-2");
    expect(markup).toContain(found.value.typeCode.crosswalk.systemLabel);
    expect(markup).toContain(found.value.typeCode.crosswalk.selfReportedLabel);
    expect(markup).toContain(reportedCode);
  });

  /**
   * 환산 표기 디자인 (DEC-056)
   *
   * 라벨과 코드가 좌우로 나란한 두 칸이라 같은 급으로 읽혔고,
   * raw 팔레트로 검정 슬래브를 깔아 페이지에서 혼자 튀었습니다.
   */
  it("환산 표기가 라벨 안에 값이 담긴 형태이고 semantic 토큰만 씁니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.typeCode?.crosswalk === undefined) {
      throw new Error("테스트용 코드 규격을 불러오지 못했습니다.");
    }
    const { markup } = renderResult();
    const start = markup.indexOf('<div class="result-crosswalk-body');
    const body = start < 0 ? "" : markup.slice(start, start + 1200);

    expect(body).not.toBe("");
    // 라벨이 위, 코드가 아래 — 담김을 형태로 보여 줍니다
    expect(body).toContain("result-crosswalk-field");
    expect(body).toContain("result-crosswalk-legend");
    expect(body).toContain("result-crosswalk-code");
    // raw 팔레트 직접 사용 금지 (design.md 3.1)
    expect(body, body).not.toMatch(/(bg|text|border)-(sand|sage|clay)-\d{2,3}/);
  });

  it("밸런스 지도는 방향 글자와 스크린리더 설명을 함께 제공합니다", () => {
    const { markup } = renderResult();

    expect(markup).toContain("관점별 방향과 기울기 지도");
    // 시각 안내 문구는 제거했습니다 (DEC-055). 뜻은 SVG <desc>가 계속 전달합니다.
    expect(markup).not.toContain("도형의 크기는 좋고 나쁨이 아니라");
    expect(markup).toContain("result-balance-key");
    expect(markup).toContain("<title>관점별 방향과 기울기 지도</title>");
    expect(markup).toContain("<desc>");
  });

  it("결과의 네 장과 내부 바로가기가 서로 연결됩니다", () => {
    const { markup } = renderResult();

    for (const id of ["result-overview", "result-scenes", "result-collaboration", "result-next"]) {
      expect(markup).toContain(`href="#${id}"`);
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("네 관점 카드는 소개 화면과 같은 네 가지 색 문법과 정렬 구조를 사용합니다", () => {
    const { markup } = renderResult();
    const tones = [...markup.matchAll(/data-perspective-tone="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(tones).toEqual(["energy", "lens", "decision", "rhythm"]);
    expect(markup).toContain("result-axis-card-grid");
    expect(markup).toContain("md:auto-rows-fr");
    expect(markup).toContain("result-axis-card-chart");
  });

  it("균형 구간이 있어도 산출된 교직 스타일을 끝까지 전달합니다", () => {
    const markup = renderBalancedResult();
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.typeCode?.crosswalk === undefined) {
      throw new Error("테스트용 코드 규격을 불러오지 못했습니다.");
    }

    expect(markup).toContain("함께 정하고 꼼꼼히 준비하는 선생님");
    expect(markup).not.toContain("결과를 나타내는 상징");
    expect(markup).toContain("balanced-male.jpg");
    expect(markup).toContain("·");
    expect(markup).toContain(found.value.typeCode.balancedNote);
    expect(markup).toContain(found.value.typeCode.crosswalk.unavailableNote);
    expect(markup).toContain('data-result-rhythm="summary"');
    expect(markup.split("나의 교직 리듬")).toHaveLength(2);
    // 균형 안내도 상황 제목이 붙은 장면 서술을 씁니다 (DEC-054).
    expect(markup).toContain("두 방식이 갈렸던 날");
    expect(markup).toContain("균형으로 나온 관점 하나를 골라");
    expect(markup).not.toContain("몰입형과는,");
  });

  it("새 신호가 있으면 장면 차이만 필요한 곳에 보여 줍니다", () => {
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
      differentiation: found.value.axes.map((axis) => ({
        axisId: axis.id,
        distinctValues: 4,
        valueRange: 4,
        isDifferentiated: true,
      })),
      unreadableAxisIds: [],
    };

    const { markup } = renderResult(signals);

    expect(markup).toContain("장면에 따라 달라지는 점");
    expect(markup).toContain("동료");
    expect(markup).toContain("+1.5");
    expect(markup).toContain("6문항");
    expect(markup).not.toContain(">근거</p>");
    expect(markup).not.toContain("응답 문항");
    expect(markup).not.toContain("응답 일관성");

    // 결과를 의심하게 만드는 메타 표시는 화면에 두지 않습니다.
    expect(markup).not.toContain("확신도");
    expect(markup).not.toContain("살펴볼 점");
    expect(markup).not.toContain("안 맞는다면");
  });

  it("신호가 없어도 기본 결과는 온전히 보이고 빈 신호 영역은 남기지 않습니다", () => {
    const { markup, narrative } = renderResult();

    expect(markup).not.toContain(narrative.oneLiner);
    expect(markup).toContain(narrative.rhythm);
    expect(markup).toContain("한눈에 보는 나");
    expect(markup).not.toContain("장면에 따라 달라지는 점");
    expect(markup).not.toContain("응답 폭");
  });

  it("1·2위 차이가 작으면 주축이라고 부르지 않습니다", () => {
    const { markup } = renderResult();

    expect(markup).toContain("함께 도드라짐");
    expect(markup).not.toContain(">주축<");
  });

  it("결과를 의심하게 만드는 안내 문구를 두지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok || found.value.resultNarrative === undefined) {
      throw new Error("테스트용 검사를 불러오지 못했습니다.");
    }
    const { markup } = renderResult();

    // 측정 범위 고지와 면책 문구는 검사 소개 화면이 맡습니다. 결과에서는 빼둡니다.
    expect(markup).not.toContain(found.value.resultNarrative.scopeNote);
    expect(markup).not.toContain("표준화된 심리검사가 아니");
  });

  /**
   * 목차가 스크롤을 따라오려면 sticky가 움직일 공간이 있어야 합니다.
   *
   * 그리드에 `items-start`가 붙으면 사이드바 칸이 목차 높이로 줄어들어,
   * sticky가 붙어 있어도 **아무 일도 일어나지 않습니다.** 화면을 열어 보기 전에는
   * 눈치채기 어렵고 테스트에도 안 잡히는 종류라 여기서 막습니다.
   */
  it("목차가 스크롤을 따라올 수 있는 구조입니다", () => {
    const { markup } = renderResult();

    // 목차 자체는 sticky여야 합니다.
    expect(markup).toMatch(/lg:sticky/);

    // 목차를 감싼 그리드가 칸 높이를 줄이면 안 됩니다.
    const grid = markup.match(/<div class="[^"]*grid[^"]*lg:grid-cols-4[^"]*"/)?.[0] ?? "";
    expect(grid, "사이드바 그리드를 찾지 못했습니다").not.toBe("");
    expect(grid, "items-start가 있으면 sticky가 동작하지 않습니다").not.toContain("items-start");
  });

  it("고정된 결과 콘텐츠 순서를 유지합니다", () => {
    const { markup } = renderResult();
    const headings = [
      "한눈에 보는 나",
      "강점이 드러나는 장면",
      "여유가 줄었을 때 나타나는 모습",
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

/**
 * 렌즈 카드 정렬 (DEC-055)
 *
 * 예전에는 도드라지는 축에만 col-span-2와 요약 문단을 줘서, 2-1-1로 어긋나고
 * 카드마다 정보량이 달라 보였습니다. 눈으로는 잘 안 잡히는 회귀라 기계가 지킵니다.
 */
describe("렌즈 카드 정렬 (DEC-055)", () => {
  it("어떤 카드도 두 칸을 차지하지 않습니다 — 한 줄에 두 장씩", () => {
    const { markup } = renderResult();
    // 카드 요소만 골라냅니다. result-hero-lens-headline 같은 자식 클래스와 겹치지 않게
    // 카드에만 붙는 data-result-hero-tone 속성을 기준으로 잡습니다.
    const cards = markup.match(/<li[^>]*data-result-hero-tone[^>]*>/g) ?? [];

    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card, card).not.toContain("col-span-2");
    }
  });

  it("네 카드가 모두 같은 구조를 갖습니다 — 요약 문단이 빠지지 않습니다", () => {
    const { markup, narrative } = renderResult();

    for (const axis of narrative.axes) {
      expect(markup, String(axis.axisId)).toContain(axis.reading.summary);
      expect(markup, String(axis.axisId)).toContain(axis.reading.headline);
    }
  });

  it("긴 제목이 어절 단위로만 끊기도록 줄바꿈 규칙을 답니다", () => {
    const { markup } = renderResult();

    expect(markup).toContain("result-hero-lens-headline");
    expect(markup).toContain("result-hero-lens-text");
  });
});

/**
 * 0점을 '진짜 대칭'과 '읽기 어려움'으로 나눠 보여 줍니다 (DEC-053)
 *
 * 답을 고르지 않은 분께 "두 방식을 비슷하게 쓰시네요"라고 말하지 않기 위한 가드입니다.
 */
describe("응답이 갈리지 않은 축 표시 (DEC-053)", () => {
  function renderWithUnreadableAxes(): string {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("테스트용 검사를 불러오지 못했습니다.");
    const profile = found.value.resultProfiles[0];
    if (profile === undefined) throw new Error("테스트용 결과 프로필이 없습니다.");

    const snapshot = {
      characterGender: "male",
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

    const signals: AssessmentSignals = {
      consistency: [],
      contextSplits: [],
      responseStyle: { id: "centered", extremeRate: 0, middleRate: 1, answeredCount: 48 },
      confidence: [],
      differentiation: found.value.axes.map((axis) => ({
        axisId: axis.id,
        distinctValues: 1,
        valueRange: 0,
        isDifferentiated: false,
      })),
      unreadableAxisIds: found.value.axes.map((axis) => axis.id),
    };

    return renderToStaticMarkup(
      <ResultRenderer
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        nickname="테스트 선생님"
        presentation={staticAssessmentCatalog.findPresentationBySlug(found.value.slug)}
        signals={signals}
      />,
    );
  }

  it("응답이 갈리지 않은 축은 '균형'이 아니라 읽기 어려웠다고 알려 줍니다", () => {
    const markup = renderWithUnreadableAxes();
    const spec = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!spec.ok) throw new Error("검사를 불러오지 못했습니다.");
    const label = spec.value.resultNarrative?.unreadableAxisLabel;
    if (label === undefined) throw new Error("읽기 어려움 문구가 없습니다.");

    expect(markup).toContain(label);
    expect(markup).not.toContain("균형 관점");
  });

  it("같은 0점이어도 응답이 갈렸으면 균형으로 보여 줍니다", () => {
    // signals 없이 그리면 예전처럼 전부 균형입니다 — 응답을 지운 뒤에도 결과가 깨지면 안 됩니다.
    const markup = renderBalancedResult();

    expect(markup).toContain("균형 관점");
  });
});
