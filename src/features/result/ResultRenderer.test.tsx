import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AssessmentSignals } from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

interface RenderOptions {
  readonly rawScore?: number;
  readonly directionSource?: AxisScore["directionSource"];
  readonly signals?: AssessmentSignals;
  readonly selfReportedCrosswalkCode?: string;
}

function renderResult(options: RenderOptions = {}) {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

  const profile = found.value.resultProfiles[0];
  if (profile === undefined) throw new Error("검사용 결과 프로필이 없습니다.");

  const rawScore = options.rawScore ?? 8;
  const axisScores: AxisScore[] = found.value.axes.map((axis) => {
    const direction = profile.poles[axis.id] ?? axis.defaultPole;
    const signedScore = direction === "positive" ? rawScore : -rawScore;
    return {
      axisId: axis.id,
      rawScore: signedScore,
      minScore: -24,
      maxScore: 24,
      normalized: (signedScore + 24) / 48,
      direction,
      directionSource: options.directionSource ?? (rawScore === 0 ? "default" : "score"),
      intensityBandId: rawScore === 0 ? "leaning" : "clear",
    };
  });

  const snapshot = {
    characterGender: "female",
    selfReportedCrosswalkCode: options.selfReportedCrosswalkCode,
    score: { resultKey: profile.key, axisScores },
  } as unknown as ResultSnapshot;
  const narrative = resolveResultNarrative(found.value, axisScores, profile);
  const presentation = staticAssessmentCatalog.findPresentationBySlug(found.value.slug);

  return {
    definition: found.value,
    profile,
    presentation,
    narrative,
    markup: renderToStaticMarkup(
      <ResultRenderer
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        nickname="테스트 선생님"
        signals={options.signals}
        presentation={presentation}
      />,
    ),
  };
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

function makeSignals(): AssessmentSignals {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

  return {
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
}

describe("결과 페이지 정보 구조", () => {
  it("결과 제목, 코드, 요약, 캐릭터를 히어로에서 한 번에 보여 줍니다", () => {
    const { markup, narrative, profile, presentation } = renderResult();
    const artwork = presentation?.typeArtwork?.find((item) => item.resultKey === profile.key)?.artwork
      .female;

    expect(markup).toContain("검사 결과 · 테스트 선생님");
    expect(markup).toContain(narrative.title);
    expect(markup).toContain(narrative.rhythm);
    expect(markup).toContain("4렌즈 코드");
    expect(markup).toContain("결과 요약");
    expect(markup).toContain("나를 상징하는 캐릭터");
    expect(markup).toContain(artwork?.src.split("/").at(-1));
    expect(markup).not.toContain(String(profile.key));
  });

  it("네 축마다 선택된 방향의 글자, 설명, 게이지를 함께 보여 줍니다", () => {
    const { markup, definition, narrative } = renderResult();
    const text = visibleText(markup);

    expect([...markup.matchAll(/data-perspective-tone=/g)]).toHaveLength(8);
    for (const axisNarrative of narrative.axes) {
      const axis = definition.axes.find((item) => item.id === axisNarrative.axisId);
      if (axis === undefined) throw new Error("축을 찾지 못했습니다.");
      const pole = axisNarrative.reading.direction === "positive" ? axis.positive : axis.negative;

      expect(markup).toContain(pole.code);
      expect(markup).toContain(pole.label);
      expect(text.split(axisNarrative.reading.headline)).toHaveLength(3);
      expect(text.split(axisNarrative.reading.summary)).toHaveLength(3);
      expect(text).toContain(axisNarrative.reading.scene);
    }
    expect(markup).toContain("5단계 중");
  });

  it("환산 표기와 근사 안내를 접지 않고 보여 줍니다", () => {
    const reportedCode = ["I", "N", "F", "P"].join("");
    const { markup, definition } = renderResult({ selfReportedCrosswalkCode: reportedCode });
    const crosswalk = definition.typeCode?.crosswalk;
    if (crosswalk === undefined) throw new Error("환산 표기 규격이 없습니다.");

    expect(markup).not.toContain("<details");
    expect(markup).toContain(crosswalk.systemLabel);
    expect(markup).toContain(crosswalk.selfReportedLabel);
    expect(markup).toContain(crosswalk.disclaimer);
    expect(markup).toContain(reportedCode);
  });

  it("요약 보기는 네 방향과 대표 장면, 협업, 다음 행동을 빠뜨리지 않습니다", () => {
    const { markup, profile } = renderResult();
    const text = visibleText(markup);

    expect(markup).toContain("나를 설명하는 네 가지 방향");
    expect(markup).toContain("교실에서 나타나는 핵심 모습");
    expect(markup).toContain(profile.shiningMoments[0]!.situation);
    expect(markup).toContain(profile.underPressure[0]!.situation);
    expect(markup).toContain(profile.withColleagues[0]!.situation);
    expect(text).toContain(profile.collaboration.naturalFit[0]);
    expect(text).toContain(profile.collaboration.needsTuning[0]);
    expect(text).toContain(profile.nextSteps[0]);
    expect(markup).toContain("전체 결과 자세히 보기");
  });

  it("자세히 보기에는 장면, 조합, 협업, 대화 질문을 유지합니다", () => {
    const { markup, profile } = renderResult();

    for (const id of ["result-overview", "result-scenes", "result-collaboration", "result-next"]) {
      expect(markup).toContain(`href=\"#${id}\"`);
      expect(markup).toContain(`id=\"${id}\"`);
    }
    expect(markup).toContain("자세히 보기");
    expect(markup).toContain("두 관점이 겹칠 때");
    expect(visibleText(markup)).toContain(profile.talkingPoints[0]);
  });
});

describe("방향 선택 결과", () => {
  it("원점수가 0이어도 기본 방향의 설명과 한 글자 코드를 사용합니다", () => {
    const { markup, definition, narrative, profile } = renderResult({
      rawScore: 0,
      directionSource: "default",
    });
    const text = visibleText(markup);

    for (const axisNarrative of narrative.axes) {
      const axis = definition.axes.find((item) => item.id === axisNarrative.axisId);
      if (axis === undefined) throw new Error("축을 찾지 못했습니다.");
      const pole = axis.defaultPole === "positive" ? axis.positive : axis.negative;
      expect(axisNarrative.reading.direction).toBe(axis.defaultPole);
      expect(markup).toContain(pole.code);
      expect(text).toContain(axisNarrative.reading.summary);
    }

    const artwork = staticAssessmentCatalog
      .findPresentationBySlug(definition.slug)
      ?.typeArtwork?.find((item) => item.resultKey === profile.key)?.artwork.female;
    expect(markup).toContain(artwork?.src.split("/").at(-1));
    expect(markup).toContain("5단계 중 1단계");
  });

  it("점수 차이가 달라도 같은 방향이면 설명 문구가 같습니다", () => {
    const close = renderResult({ rawScore: 1 }).narrative.axes.map((item) => item.reading);
    const strong = renderResult({ rawScore: 20 }).narrative.axes.map((item) => item.reading);

    expect(close).toEqual(strong);
  });
});

describe("응답 신호", () => {
  it("상황 차이가 있을 때만 근거와 함께 자세히 보여 줍니다", () => {
    const { markup } = renderResult({ signals: makeSignals() });

    expect(markup).toContain("상황에 따라 달라지는 점");
    expect(markup).toContain("동료");
    expect(markup).toContain("+1.5");
    expect(markup).toContain("6문항");
  });

  it("신호가 없으면 기본 결과만 온전히 보여 줍니다", () => {
    const { markup, narrative } = renderResult();

    expect(markup).toContain(narrative.rhythm);
    expect(markup).toContain("나를 설명하는 네 가지 방향");
    expect(markup).not.toContain("상황에 따라 달라지는 점");
  });
});
