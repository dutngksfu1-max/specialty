import { describe, expect, it } from "vitest";

import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

/**
 * 실제 콘텐츠 품질 검사 (docs/content/teacher-style-v1.md 5.2 / 6.3)
 *
 * 형식(Zod)만으로는 못 잡는 **작성 규칙**을 여기서 지킵니다.
 * 나중에 문구를 고칠 때 규칙을 넘어서면 여기서 걸립니다.
 */

const parsed = parseAssessmentDefinition(teacherStyleV1Package);
if (!parsed.ok) {
  throw new Error(`콘텐츠 검증 실패: ${parsed.error.detail ?? ""}`);
}
const definition = parsed.value;

/** 길이를 셀 때 공백과 문장부호는 빼고 셉니다. */
function letters(text: string): number {
  return text.replace(/[\s.,!?'"·…‘’“”()]/g, "").length;
}

/** 화면에 나가는 모든 문자열 */
function allVisibleText(): readonly string[] {
  return [
    definition.title,
    definition.summary,
    definition.description,
    ...definition.axes.flatMap((axis) => [
      axis.name,
      axis.positive.label,
      axis.positive.shortLabel,
      axis.positive.description,
      axis.negative.label,
      axis.negative.shortLabel,
      axis.negative.description,
      ...axis.intensityBands.map((band) => band.label),
    ]),
    ...definition.sections.map((section) => section.description ?? ""),
    ...definition.questions.map((question) => question.text),
    ...definition.resultProfiles.flatMap((profile) => [
      profile.title,
      profile.oneLiner,
      profile.rhythm,
      ...profile.shiningMoments,
      ...profile.underPressure,
      ...profile.withColleagues,
      ...profile.collaboration.naturalFit,
      ...profile.collaboration.needsTuning,
    ]),
  ];
}

describe("축 정의 (DEC-023)", () => {
  it("축이 4개이고 식별자가 중립적입니다", () => {
    expect(definition.axes).toHaveLength(4);
    for (const axis of definition.axes) {
      expect(String(axis.id)).toMatch(/^axis-[a-z]+$/);
    }
  });

  it("양 끝 이름이 서로 다르고, 짧은 이름은 6자 이내입니다", () => {
    for (const axis of definition.axes) {
      expect(axis.positive.label).not.toBe(axis.negative.label);
      expect(axis.positive.shortLabel).not.toBe(axis.negative.shortLabel);
      expect(letters(axis.positive.shortLabel)).toBeLessThanOrEqual(6);
      expect(letters(axis.negative.shortLabel)).toBeLessThanOrEqual(6);
      expect(axis.positive.description.length).toBeGreaterThan(10);
      expect(axis.negative.description.length).toBeGreaterThan(10);
    }
  });

  it("축 이름이 서로 겹치지 않습니다", () => {
    const names = definition.axes.map((axis) => axis.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("문항 작성 규칙 (5.2)", () => {
  it("40문항이 축마다 10개씩, polarity가 5개씩 나뉩니다", () => {
    expect(definition.questions).toHaveLength(40);

    for (const axis of definition.axes) {
      const mine = definition.questions.filter((question) => question.axisId === axis.id);
      expect(mine).toHaveLength(10);
      expect(mine.filter((question) => question.polarity === 1)).toHaveLength(5);
      expect(mine.filter((question) => question.polarity === -1)).toHaveLength(5);
    }
  });

  it("Part마다 10문항이고 네 축이 모두 섞여 있습니다", () => {
    for (const section of definition.sections) {
      const mine = definition.questions.filter((question) => question.sectionId === section.id);
      expect(mine).toHaveLength(10);
      const axesInSection = new Set(mine.map((question) => String(question.axisId)));
      expect(axesInSection.size).toBe(4);
    }
  });

  it("한 Part 안에서 polarity가 한쪽으로 쏠리지 않습니다", () => {
    for (const section of definition.sections) {
      const mine = definition.questions.filter((question) => question.sectionId === section.id);
      const positives = mine.filter((question) => question.polarity === 1).length;
      // 10문항 중 +1이 3~7개 사이면 충분히 섞인 것으로 봅니다.
      expect(positives).toBeGreaterThanOrEqual(3);
      expect(positives).toBeLessThanOrEqual(7);
    }
  });

  it("문항 길이가 15~45자입니다 (40자 내외)", () => {
    for (const question of definition.questions) {
      const length = letters(question.text);
      expect(length, question.text).toBeGreaterThanOrEqual(15);
      expect(length, question.text).toBeLessThanOrEqual(45);
    }
  });

  it("문항에 부정문을 쓰지 않습니다 (polarity로 방향을 뒤집습니다)", () => {
    for (const question of definition.questions) {
      expect(question.text, question.text).not.toMatch(/않(는다|다|아|고)/);
    }
  });

  it("문항에 극단 표현을 쓰지 않습니다", () => {
    for (const question of definition.questions) {
      expect(question.text, question.text).not.toMatch(/항상|절대|반드시|무조건/);
    }
  });

  it("문항이 성향을 묻는 어미로 끝납니다", () => {
    for (const question of definition.questions) {
      expect(question.text, question.text).toMatch(/(편이다|편하다|느낀다|생각한다|본다|한다|놓인다)\.$/);
    }
  });

  it("문항 텍스트가 서로 중복되지 않습니다", () => {
    const texts = definition.questions.map((question) => question.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("결과 프로필 작성 규칙 (6.3)", () => {
  it("16개 조합이 모두 있고 제목이 서로 다릅니다", () => {
    expect(definition.resultProfiles).toHaveLength(16);
    const titles = definition.resultProfiles.map((profile) => profile.title);
    expect(new Set(titles).size).toBe(16);
  });

  it("제목이 12~20자이고 분류 어미를 쓰지 않습니다", () => {
    for (const profile of definition.resultProfiles) {
      const length = letters(profile.title);
      expect(length, profile.title).toBeGreaterThanOrEqual(12);
      expect(length, profile.title).toBeLessThanOrEqual(20);
      expect(profile.title, profile.title).not.toMatch(/(형|타입)$/);
    }
  });

  it("한 줄 설명이 28~55자입니다", () => {
    for (const profile of definition.resultProfiles) {
      const length = letters(profile.oneLiner);
      expect(length, profile.oneLiner).toBeGreaterThanOrEqual(28);
      expect(length, profile.oneLiner).toBeLessThanOrEqual(55);
    }
  });

  it("각 묶음의 항목 수가 규격을 지킵니다", () => {
    for (const profile of definition.resultProfiles) {
      expect(profile.shiningMoments).toHaveLength(3);
      expect(profile.underPressure.length).toBeGreaterThanOrEqual(2);
      expect(profile.underPressure.length).toBeLessThanOrEqual(3);
      expect(profile.withColleagues.length).toBeGreaterThanOrEqual(2);
      expect(profile.withColleagues.length).toBeLessThanOrEqual(3);
      expect(profile.collaboration.naturalFit).toHaveLength(2);
      expect(profile.collaboration.needsTuning).toHaveLength(2);
    }
  });

  it("결과 키가 사용자에게 보이는 문구에 새어 나오지 않습니다 (AC-1)", () => {
    for (const profile of definition.resultProfiles) {
      const visible = [
        profile.title,
        profile.oneLiner,
        profile.rhythm,
        ...profile.shiningMoments,
        ...profile.underPressure,
        ...profile.withColleagues,
        ...profile.collaboration.naturalFit,
        ...profile.collaboration.needsTuning,
      ].join(" ");
      expect(visible).not.toContain(String(profile.key));
    }
  });

  it("'조율하면 더 편한 스타일'에 구체적인 조율 방법이 들어 있습니다", () => {
    for (const profile of definition.resultProfiles) {
      for (const item of profile.collaboration.needsTuning) {
        // 어떤 스타일과의 이야기인지 밝히고("~형과는"),
        // "~해 두면 / ~해 주면" 형태로 구체적인 방법을 한 번은 제안해야 합니다.
        expect(item, item).toMatch(/형과는/);
        // "~해 두면 / ~해 주면 / ~하면" 처럼 조건절이 있어야 실제로 해 볼 수 있는 조언입니다.
        expect(item, item).toMatch(/[가-힣]면[\s,]/);
      }
    }
  });
});

describe("전체 문구 금지 표현", () => {
  it("'궁합'·등급·순위·백분위 표현이 없습니다", () => {
    for (const text of allVisibleText()) {
      expect(text, text).not.toMatch(/궁합|등급|순위|백분위|점수가 높|점수가 낮/);
    }
  });

  it("사람을 상자에 넣는 말투를 쓰지 않습니다", () => {
    for (const text of allVisibleText()) {
      expect(text, text).not.toMatch(/당신은|너는 |당신의 성격/);
    }
  });

  it("낙인이 되는 표현이 없습니다", () => {
    for (const text of allVisibleText()) {
      expect(text, text).not.toMatch(/게으[르른]|우유부단|무책임|산만한|예민한 성격/);
    }
  });

  it("fixture 잔재가 남아 있지 않습니다", () => {
    for (const text of allVisibleText()) {
      expect(text, text).not.toContain("fixture");
    }
  });

  it("노출이 금지된 표현이 없습니다 (AGENTS.md 1.1)", () => {
    const forbiddenTerm = new RegExp(["m", "b", "t", "i"].join(""), "i");
    for (const text of allVisibleText()) {
      expect(text, text).not.toMatch(forbiddenTerm);
      expect(text, text).not.toMatch(/\b[EI][NS][TF][JP]\b/i);
    }
  });
});

describe("채점과의 연결", () => {
  it("모든 결과 프로필의 poles가 네 축을 정확히 가리킵니다", () => {
    const axisIds = definition.axes.map((axis) => String(axis.id));

    for (const profile of definition.resultProfiles) {
      expect(Object.keys(profile.poles).sort()).toEqual([...axisIds].sort());
    }
  });

  it("축당 최대 절대 점수가 20점이고 구간이 이를 덮습니다", () => {
    for (const axis of definition.axes) {
      const count = definition.questions.filter((question) => question.axisId === axis.id).length;
      const maxAbs = count * 2; // 5점 척도의 최대 편차 2
      expect(maxAbs).toBe(20);

      const last = [...axis.intensityBands].sort((a, b) => a.maxAbsScore - b.maxAbsScore).at(-1);
      expect(last?.maxAbsScore).toBe(maxAbs);
    }
  });
});
