import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { ResultStoryView } from "@/features/result/ResultStoryView";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

/**
 * 줄글 보기 회귀 방지 (DEC-069)
 *
 * 여기서 막는 것은 "예쁘게 보이는가"가 아니라 **피드백으로 받은 증상이 돌아오는가**입니다.
 * 순위 배지·분류어·강도 이름이 다시 들어오면 이 파일이 먼저 깨집니다.
 */

function renderStory(profileIndex: number, rawScore = 8) {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

  const profile = found.value.resultProfiles[profileIndex];
  if (profile === undefined) throw new Error("검사용 결과 프로필이 없습니다.");

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
      directionSource: rawScore === 0 ? "default" : "score",
      intensityBandId: rawScore === 0 ? "leaning" : "clear",
    };
  });

  const snapshot = {
    characterGender: "female",
    score: { resultKey: profile.key, axisScores },
  } as unknown as ResultSnapshot;

  const narrative = resolveResultNarrative(found.value, axisScores, profile);

  return {
    definition: found.value,
    profile,
    markup: renderToStaticMarkup(
      <ResultStoryView
        definition={found.value}
        snapshot={snapshot}
        profile={profile}
        narrative={narrative.axes}
      />,
    ),
  };
}

/** 성격 묘사 구역 이름. 구역이 늘면 여기 한 줄만 더합니다. */
const PORTRAIT_SECTIONS = [
  "opening",
  "classroomSigns",
  "fromKids",
  "drive",
  "misread",
  "whenTired",
] as const;

/** 어절 3개 묶음. 이만큼 겹치면 사람이 읽었을 때 "아까 그 문장"으로 느낍니다. */
function triGrams(text: string): readonly string[] {
  const words = text
    .replace(/[.,"'“”‘’?!]/gu, "")
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  return words.slice(0, Math.max(words.length - 2, 0)).map((_, index) => words.slice(index, index + 3).join(" "));
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

describe("ResultStoryView", () => {
  it("축 이름을 제목으로 세웁니다", () => {
    const { definition, markup } = renderStory(0);

    /*
      피드백 4번 — "네 가지가 뭘 말하는지 모르겠다".
      축 이름이 h2로 나와야 합니다. 작은 회색 글씨로 돌아가면 여기서 깨집니다.
    */
    for (const axis of definition.axes) {
      expect(markup).toContain(`text-h2 text-foreground sm:text-h2-lg">${axis.name}<`);
    }
  });

  it("순위 배지와 강도 이름을 보여 주지 않습니다", () => {
    const { definition, markup } = renderStory(0);
    const text = visibleText(markup);

    // 피드백 3번 — 사족이 시선을 가져갑니다.
    expect(text).not.toContain("가장 도드라짐");
    expect(text).not.toContain("함께 도드라짐");
    expect(text).not.toContain("관점 01");

    // 피드백 5번 — 강도 이름은 정보를 주지 않습니다.
    for (const band of definition.axes[0]?.intensityBands ?? []) {
      expect(text).not.toContain(band.label);
    }
  });

  it("게이지에 분류 이름 대신 하는 일을 적습니다", () => {
    const { definition, markup } = renderStory(0);
    const text = visibleText(markup);

    for (const axis of definition.axes) {
      for (const pole of [axis.positive, axis.negative]) {
        // "몰입형" 같은 분류어는 화면에서 사라져야 합니다.
        expect(text).not.toContain(pole.shortLabel);
        if (pole.plainLabel !== undefined) expect(text).toContain(pole.plainLabel);
      }
    }
  });

  it("열여섯 유형 모두 성격 묘사를 갖고, 네 구역이 모두 화면에 나옵니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    expect(found.value.resultProfiles).toHaveLength(16);

    found.value.resultProfiles.forEach((profile, index) => {
      const portrait = profile.portrait;
      expect(portrait, `${profile.key}에 성격 묘사가 없습니다`).toBeDefined();
      if (portrait === undefined) return;

      const { markup } = renderStory(index);
      const text = visibleText(markup);

      for (const section of PORTRAIT_SECTIONS.map((name) => portrait[name])) {
        for (const paragraph of section) expect(text).toContain(paragraph);
      }
    });
  });

  /*
    축 원고가 자기 장면 영역을 벗어나면 두 축이 같은 것을 재기 시작합니다
    (AGENTS.md — "축마다 전용 장면군을 씁니다").

    영역은 문항의 context가 정합니다.
      axis-energy   동료 · 혼자
      axis-lens     수업 · 생활지도
      axis-decision 생활지도 · 업무 · 학부모
      axis-rhythm   업무 · 수업 진행 · 혼자
  */
  it("축 원고가 다른 축의 장면을 끌어오지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    /** 그 축에서 쓰면 안 되는 낱말 — 다른 축의 장면을 가리키는 말입니다. */
    const offLimits: Readonly<Record<string, readonly string[]>> = {
      // 협의·회의는 axis-energy가 재는 장면입니다.
      "axis-lens": ["회의", "협의회", "교무실", "동료와 이야기"],
      "axis-decision": ["회의", "협의회", "교무실"],
      "axis-rhythm": ["회의", "협의회"],
      // 기록·규칙은 각각 axis-lens와 axis-decision이 재는 장면입니다.
      "axis-energy": ["규칙", "생활지도", "공문"],
    };

    for (const axis of found.value.resultNarrative?.axes ?? []) {
      const banned = offLimits[String(axis.axisId)] ?? [];
      for (const reading of axis.readings) {
        const story = reading.story;
        if (story === undefined) continue;
        const prose = [story.lead, ...story.body].join(" ");
        for (const word of banned) {
          expect(
            prose.includes(word),
            `${String(axis.axisId)} ${reading.direction} 원고에 다른 축의 장면("${word}")이 들어 있습니다`,
          ).toBe(false);
        }
      }
    }
  });

  /*
    결과 문장이 문항을 옮겨 적은 것이면, 5~10분을 들여 답한 사람은
    자기가 방금 고른 문장을 다시 읽게 됩니다. 완전 일치만 보면 어미만 바꾼
    재진술을 놓치므로 **어절 3-gram**이 겹치는지를 봅니다.
  */
  it("성격 묘사가 문항을 다시 쓰지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    const questionGrams = new Map<string, string>();
    for (const question of found.value.questions) {
      for (const gram of triGrams(question.text)) questionGrams.set(gram, question.text);
    }
    expect(questionGrams.size).toBeGreaterThan(100);

    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;

      for (const paragraph of PORTRAIT_SECTIONS.flatMap((name) => portrait[name])) {
        for (const gram of triGrams(paragraph)) {
          expect(
            questionGrams.get(gram) ?? null,
            `${profile.key}의 성격 묘사가 문항을 다시 썼습니다 — 겹친 대목 "${gram}"`,
          ).toBeNull();
        }
      }
    }
  });

  /*
    문항이 묻는 영역 안에만 머물면 "체크한 걸 그대로 돌려받았다"가 됩니다.
    교실 신호와 아이 시점은 문항이 한 번도 묻지 않은 자리여야 합니다.
  */
  it("교실 신호와 아이 시점이 문항이 다루지 않은 것을 말합니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    /** 문항은 모두 교사 시점입니다. 아이 시점 문장은 문항에서 나올 수 없습니다. */
    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;

      expect(portrait.fromKids.join(" ")).toContain("아이들은");
      // 교실 신호는 눈으로 볼 수 있는 것을 말해야 합니다.
      const signs = portrait.classroomSigns.join(" ");
      expect(
        /교실|책상|서랍|게시판|알림장|상자|파일|자료|규칙|계획/u.test(signs),
        `${profile.key}의 교실 신호에 눈에 보이는 것이 없습니다`,
      ).toBe(true);
    }
  });

  it("읽는 사람을 남처럼 부르지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    // "이 선생님"은 결과지를 읽는 본인을 3인칭으로 부르는 말입니다.
    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;
      for (const paragraph of PORTRAIT_SECTIONS.flatMap((name) => portrait[name])) {
        expect(paragraph.startsWith("이 선생님")).toBe(false);
        expect(paragraph).not.toContain(" 이 선생님");
      }
    }
  });

  it("교실 이야기를 동료·업무보다 먼저 보여 줍니다", () => {
    const { markup } = renderStory(0);

    const classroom = markup.indexOf("교실에서 드러나는 모습");
    const colleagues = markup.indexOf("동료와 함께 일할 때");
    expect(classroom).toBeGreaterThan(-1);
    expect(colleagues).toBeGreaterThan(classroom);
  });

  it("성격 묘사가 히어로 요약보다 깁니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    /*
      피드백 1번 — "교직 리듬이 너무 짧아서 아쉽다".
      들인 시간에 견줄 분량인지를 숫자로 잡아 둡니다.
    */
    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;

      const length = PORTRAIT_SECTIONS.flatMap((name) => portrait[name]).join("").length;
      expect(length, `${profile.key}의 성격 묘사가 짧습니다`).toBeGreaterThan(
        profile.rhythm.length * 2,
      );
    }
  });

  it("점수가 0이어도 한 방향으로 읽히고 눈금이 최소 한 칸 찹니다", () => {
    // DEC-068을 그대로 따릅니다. 줄글 보기가 중립 상태를 되살리면 안 됩니다.
    const { markup } = renderStory(0, 0);

    expect(markup).toContain("bg-chart-positive");
    expect(visibleText(markup)).not.toContain("판단 보류");
  });
});
