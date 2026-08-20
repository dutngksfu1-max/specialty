import { describe, expect, it } from "vitest";

import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

/**
 * 실제 콘텐츠 품질 검사 (docs/content/teacher-style-v1.md 5.2 / 6.3)
 *
 * 형식(Zod)만으로는 못 잡는 **작성 규칙**을 여기서 지킵니다.
 * 나중에 문구를 고칠 때 규칙을 넘어서면 여기서 걸립니다.
 *
 * contentVersion 3.0.0에서 추가된 검사 (검수안 5절)
 *   - 축 간 어휘 누수: 한 축 전용 낱말이 다른 축 문항에 나오면 실패
 *   - 사회적 바람직성: 반박하기 어려운 문형을 차단
 *   - 장면 편중: 한 축 안에서 같은 장면이 3번 이상 나오면 실패
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
    ...(definition.resultNarrative === undefined
      ? []
      : [
          definition.resultNarrative.balancedTitle,
          definition.resultNarrative.balancedOneLiner,
          definition.resultNarrative.balancedAxisNote,
          ...definition.resultNarrative.balancedGuidance.shiningMoments.flatMap((note) => [
            note.scene,
            note.text,
          ]),
          ...definition.resultNarrative.balancedGuidance.underPressure.flatMap((note) => [
            note.scene,
            note.text,
          ]),
          ...definition.resultNarrative.balancedGuidance.withColleagues.flatMap((note) => [
            note.scene,
            note.text,
          ]),
          ...definition.resultNarrative.balancedGuidance.collaboration.naturalFit,
          ...definition.resultNarrative.balancedGuidance.collaboration.needsTuning,
          ...definition.resultNarrative.balancedGuidance.nextSteps,
          ...definition.resultNarrative.balancedGuidance.talkingPoints,
          ...definition.resultNarrative.axes.flatMap((axis) =>
            axis.readings.flatMap((reading) => [
              reading.headline,
              reading.summary,
              reading.rhythm,
            ]),
          ),
        ]),
    ...definition.axisCombinations.flatMap((combination) => [
      combination.title,
      ...combination.readings.map((reading) => reading.text),
    ]),
    ...definition.sections.map((section) => section.description ?? ""),
    ...definition.questions.map((question) => question.text),
    ...definition.resultProfiles.flatMap((profile) => [
      profile.title,
      profile.oneLiner,
      profile.rhythm,
      ...profile.shiningMoments.flatMap((note) => [note.scene, note.text]),
      ...profile.underPressure.flatMap((note) => [note.scene, note.text]),
      ...profile.withColleagues.flatMap((note) => [note.scene, note.text]),
      ...profile.collaboration.naturalFit,
      ...profile.collaboration.needsTuning,
      ...profile.nextSteps,
      ...profile.talkingPoints,
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

  it("축 이름과 짧은 이름이 서로 겹치지 않습니다", () => {
    const names = definition.axes.map((axis) => axis.name);
    expect(new Set(names).size).toBe(names.length);

    const shortLabels = definition.axes.flatMap((axis) => [
      axis.positive.shortLabel,
      axis.negative.shortLabel,
    ]);
    expect(new Set(shortLabels).size).toBe(shortLabels.length);
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

  /**
   * 축 간 어휘 누수 (신규)
   *
   * 축마다 전용 장면군을 쓰기로 했으므로, 한 축의 전용 낱말이 다른 축 문항에 나오면
   * 두 축이 같은 것을 재기 시작했다는 신호입니다. 이게 이전 버전에서 축이
   * 사실상 3개가 되어 버린 원인이었습니다.
   */
  it("한 축 전용 어휘가 다른 축 문항에 새어 들어가지 않습니다", () => {
    const ownedWords: Readonly<Record<string, readonly string[]>> = {
      "axis-energy": ["혼자", "동료와", "옆 반", "대화", "협의회", "털어놓"],
      "axis-rhythm": ["계획", "마감", "미리", "정해 두고", "일정"],
      "axis-decision": ["기준", "규정", "사정", "형편", "잘못"],
      "axis-lens": ["관찰", "근거", "사실대로", "결과물", "떠올리"],
    };

    for (const question of definition.questions) {
      for (const [owner, words] of Object.entries(ownedWords)) {
        if (owner === String(question.axisId)) continue;
        for (const word of words) {
          expect(
            question.text.includes(word),
            `${question.id}(${String(question.axisId)})에 ${owner} 전용 어휘 "${word}"가 있습니다: ${question.text}`,
          ).toBe(false);
        }
      }
    }
  });

  /**
   * 사회적 바람직성 (신규)
   *
   * 교사라면 누구나 "그렇다"고 답할 문장은 사람을 구분해 내지 못합니다.
   * 10문항 중 2~3개가 이러면 실질 문항 수가 7~8개로 줄어듭니다.
   */
  it("반박하기 어려운 문형을 쓰지 않습니다", () => {
    for (const question of definition.questions) {
      expect(question.text, question.text).not.toMatch(
        /아이를 사랑|최선을 다|열심히 하는 편|노력하는 편|아이들에게 좋다|중요하다고 생각한다\.$/,
      );
    }
  });

  /**
   * 장면 편중 (신규)
   *
   * 한 축의 10문항이 같은 장면만 맴돌면, 그 축은 "성향"이 아니라
   * "그 장면에 대한 태도"를 재게 됩니다.
   */
  it("한 축 안에서 같은 장면이 3번 이상 나오지 않습니다", () => {
    // 장면은 문항 텍스트에서 뽑을 수 없으므로, 대표 낱말로 장면을 추정합니다.
    const sceneMarkers: readonly (readonly [string, RegExp])[] = [
      ["연수", /연수/],
      ["회의", /회의|협의회/],
      ["학부모", /학부모/],
      ["업무", /공문|업무|마감/],
      ["교재연구", /교재 연구|단원/],
      ["수업진행", /수업 중|교실 분위기|활동을 고르/],
      ["갈등중재", /다툼/],
      ["생활지도", /늦는 아이|잘못/],
    ];

    for (const axis of definition.axes) {
      const mine = definition.questions.filter((question) => question.axisId === axis.id);
      for (const [scene, pattern] of sceneMarkers) {
        const hits = mine.filter((question) => pattern.test(question.text)).length;
        expect(hits, `${String(axis.id)}의 "${scene}" 장면이 ${hits}회입니다`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("축 조합 해석 (3.0.0 신규)", () => {
  it("조합마다 두 축을 읽고, 방향 조합 4가지를 모두 담습니다", () => {
    expect(definition.axisCombinations.length).toBeGreaterThanOrEqual(1);

    for (const combination of definition.axisCombinations) {
      expect(combination.axisIds).toHaveLength(2);
      expect(combination.readings).toHaveLength(4);
      for (const reading of combination.readings) {
        expect(letters(reading.text)).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it("조합이 가리키는 축이 실제로 존재합니다", () => {
    const axisIds = new Set(definition.axes.map((axis) => String(axis.id)));
    for (const combination of definition.axisCombinations) {
      for (const axisId of combination.axisIds) {
        expect(axisIds.has(String(axisId))).toBe(true);
      }
    }
  });
});

describe("강도·균형 결과 서술 (DEC-046)", () => {
  it("모든 축과 강도 구간을 방향성에 맞게 빠짐없이 설명합니다", () => {
    const narrative = definition.resultNarrative;
    expect(narrative).toBeDefined();
    if (narrative === undefined) return;

    expect(narrative.axes).toHaveLength(definition.axes.length);
    for (const axis of definition.axes) {
      const narrativeAxis = narrative.axes.find((candidate) => candidate.axisId === axis.id);
      expect(narrativeAxis).toBeDefined();
      if (narrativeAxis === undefined) continue;

      for (const band of axis.intensityBands) {
        const readings = narrativeAxis.readings.filter(
          (reading) => reading.intensityBandId === band.id,
        );
        expect(readings.map((reading) => reading.direction).sort()).toEqual(
          band.directional ? ["negative", "positive"] : ["balanced"],
        );
      }
    }
  });

  it("교직 리듬은 에너지 맥락 경계를 덧붙여 전체 설명을 한 문장 더 제공합니다", () => {
    const narrative = definition.resultNarrative;
    if (narrative === undefined) throw new Error("결과 서술이 없습니다.");

    for (const axis of narrative.axes) {
      for (const reading of axis.readings) {
        const expectedSentenceCount = String(axis.axisId) === "axis-energy" ? 2 : 1;
        expect(reading.rhythm.match(/[.!?]/g), reading.rhythm).toHaveLength(
          expectedSentenceCount,
        );
      }
    }
  });

  it("회복 방식은 학생 대상 말수로, 유연성은 미루는 습관으로 확대하지 않습니다", () => {
    const narrative = definition.resultNarrative;
    if (narrative === undefined) throw new Error("결과 서술이 없습니다.");

    const energy = narrative.axes.find((axis) => String(axis.axisId) === "axis-energy");
    const rhythm = narrative.axes.find((axis) => String(axis.axisId) === "axis-rhythm");
    expect(energy).toBeDefined();
    expect(rhythm).toBeDefined();

    for (const reading of energy?.readings ?? []) {
      expect(reading.rhythm).not.toMatch(/말수가 적|말없이|떠들썩|큰소리/);
      expect(reading.rhythm).toMatch(/뜻하지|별개|판단할 수 없|결과가 아닙니다/);
    }

    for (const reading of rhythm?.readings.filter(
      (reading) => reading.direction === "negative",
    ) ?? []) {
      expect(reading.rhythm).toContain("마감을 미루는 습관을 뜻하지는 않습니다");
    }
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
      expect(profile.nextSteps).toHaveLength(3);
      expect(profile.talkingPoints).toHaveLength(3);
    }
  });

  it("장면 라벨은 정해진 다섯 가지만 씁니다", () => {
    const allowed = new Set(["수업", "생활지도", "업무", "동료", "학부모"]);
    for (const profile of definition.resultProfiles) {
      const notes = [...profile.shiningMoments, ...profile.underPressure, ...profile.withColleagues];
      for (const note of notes) {
        expect(allowed.has(note.scene), `${profile.key}: 모르는 장면 "${note.scene}"`).toBe(true);
      }
    }
  });

  it("'빛나는 순간'이 한 장면에만 몰리지 않습니다", () => {
    for (const profile of definition.resultProfiles) {
      const scenes = new Set(profile.shiningMoments.map((note) => note.scene));
      expect(scenes.size, `${profile.key}의 빛나는 순간이 ${scenes.size}개 장면에만 있습니다`).toBeGreaterThanOrEqual(2);
    }
  });

  it("'내일 해 볼 것'이 성향 서술이 아니라 행동 제안입니다", () => {
    for (const profile of definition.resultProfiles) {
      for (const step of profile.nextSteps) {
        // 권유형 어미로 끝나야 실제로 해 볼 수 있는 제안입니다.
        expect(step, `${profile.key}: ${step}`).toMatch(/(보세요|두세요|주세요|정하세요)\.$/);
      }
    }
  });

  it("'동료와 나눌 질문'이 질문 형태입니다", () => {
    for (const profile of definition.resultProfiles) {
      for (const point of profile.talkingPoints) {
        expect(point, `${profile.key}: ${point}`).toMatch(/\?$/);
      }
    }
  });

  it("결과 키가 사용자에게 보이는 문구에 새어 나오지 않습니다 (AC-1)", () => {
    for (const profile of definition.resultProfiles) {
      const visible = [
        profile.title,
        profile.oneLiner,
        profile.rhythm,
        ...profile.shiningMoments.map((note) => note.text),
        ...profile.underPressure.map((note) => note.text),
        ...profile.withColleagues.map((note) => note.text),
        ...profile.collaboration.naturalFit,
        ...profile.collaboration.needsTuning,
        ...profile.nextSteps,
        ...profile.talkingPoints,
      ].join(" ");
      expect(visible).not.toContain(String(profile.key));
    }
  });

  it("'미리 맞춰 두면 좋은 점'에 구체적인 조율 방법이 들어 있습니다", () => {
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

  it("'함께할 때 잘 이어지는 점'도 어떤 스타일인지 밝힙니다", () => {
    for (const profile of definition.resultProfiles) {
      for (const item of profile.collaboration.naturalFit) {
        expect(item, item).toMatch(/형과는/);
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

  it("측정하지 않은 긍정적 결과를 보장하지 않습니다", () => {
    for (const text of allVisibleText()) {
      expect(text, text).not.toMatch(
        /억울한 아이가 생기지|상담에서 신뢰를 얻|상담이 희망적으로 끝|아이들이 .*오래 기억|교실이 흔들리지/,
      );
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
