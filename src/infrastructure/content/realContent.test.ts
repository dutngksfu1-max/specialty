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
          definition.resultNarrative.scopeNote,
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
  it("48문항이 축마다 12개씩, polarity가 6개씩 나뉩니다", () => {
    expect(definition.questions).toHaveLength(48);

    for (const axis of definition.axes) {
      const mine = definition.questions.filter((question) => question.axisId === axis.id);
      expect(mine).toHaveLength(12);
      expect(mine.filter((question) => question.polarity === 1)).toHaveLength(6);
      expect(mine.filter((question) => question.polarity === -1)).toHaveLength(6);
    }
  });

  it("Part마다 12문항이고 네 축이 모두 섞여 있습니다", () => {
    for (const section of definition.sections) {
      const mine = definition.questions.filter((question) => question.sectionId === section.id);
      expect(mine).toHaveLength(12);
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

/**
 * 맥락 태그와 S4(맥락 분화) 가용성 — docs/content/teacher-style-v1-audit.md
 *
 * 감사 문서의 수치를 코드가 강제합니다. 문항이나 태그를 바꾸면 여기가 먼저 실패하므로,
 * 감사 문서를 함께 갱신하지 않고 지나갈 수 없습니다.
 */
/**
 * 언어 규율 — 강도가 확신을 올리지 않습니다 (docs/PRD-result-v2.md 6.3)
 *
 * 5구간을 검증 데이터 없이 쓸 수 있는 근거가 바로 이 규율입니다.
 * 구간이 올라가면 **몇 개의 장면에서 보이는가**가 달라질 뿐,
 * **얼마나 맞는가**를 더 세게 주장하지 않습니다.
 *
 * 사람이 문구를 고칠 때 조용히 무너지기 쉬운 규칙이라 기계가 지킵니다.
 */
describe("언어 규율 (DEC-047)", () => {
  const narrative = definition.resultNarrative;
  if (narrative === undefined) throw new Error("결과 서술이 없습니다.");

  const allReadings = narrative.axes.flatMap((axis) =>
    axis.readings.map((reading) => ({ axisId: String(axis.axisId), reading })),
  );

  it("확신을 끌어올리는 표현을 쓰지 않습니다", () => {
    // "매우 뚜렷해요" 같은 표현은 강도를 확신으로 바꿔 읽게 만듭니다.
    const forbidden = /확실히|틀림없이|분명히 그렇|매우 뚜렷해|반드시|당연히/;

    for (const { axisId, reading } of allReadings) {
      for (const text of [reading.headline, reading.summary, reading.rhythm]) {
        expect(text, `${axisId}/${reading.intensityBandId}: ${text}`).not.toMatch(forbidden);
      }
    }
  });

  it("높은 구간일수록 장면 범위를 넓게 말합니다", () => {
    // 구간마다 '어디에서 보이는가'를 가리키는 표현이 있어야 합니다.
    const scopeWords: Readonly<Record<string, RegExp>> = {
      leaning: /어떤 장면/,
      clear: /여러 장면/,
      strong: /장면이 바뀌어도/,
      defining: /대부분의 장면/,
    };

    for (const { axisId, reading } of allReadings) {
      const pattern = scopeWords[reading.intensityBandId];
      if (pattern === undefined) continue;

      const joined = `${reading.headline} ${reading.summary} ${reading.rhythm}`;
      expect(joined, `${axisId}/${reading.intensityBandId}`).toMatch(pattern);
    }
  });

  it("균형 구간은 방향을 단정하지 않습니다", () => {
    const balanced = allReadings.filter((item) => item.reading.intensityBandId === "balanced");
    expect(balanced.length).toBeGreaterThan(0);

    for (const { axisId, reading } of balanced) {
      const joined = `${reading.headline} ${reading.summary} ${reading.rhythm}`;
      // '두 방식'을 함께 언급해, 한쪽으로 확정하지 않았음을 드러냅니다.
      expect(joined, `${axisId}/balanced: ${joined}`).toMatch(/두 방식|비슷하게/);
    }
  });

  /**
   * 방향이 반대인데 문구가 같으면, 읽는 사람은 자기가 어느 쪽인지 알 수 없습니다.
   * 특히 `summary`는 결과 상단 한 줄 설명이라 방향이 반드시 드러나야 합니다.
   */
  it("같은 구간에서 방향이 다르면 문구도 다릅니다", () => {
    for (const axis of narrative.axes) {
      const byBand = new Map<string, { headline: string; summary: string; rhythm: string }[]>();
      for (const reading of axis.readings) {
        if (reading.direction === "balanced") continue;
        byBand.set(reading.intensityBandId, [
          ...(byBand.get(reading.intensityBandId) ?? []),
          reading,
        ]);
      }

      for (const [bandId, readings] of byBand) {
        for (const field of ["headline", "summary", "rhythm"] as const) {
          const texts = readings.map((reading) => reading[field]);
          expect(
            new Set(texts).size,
            `${String(axis.axisId)}/${bandId}/${field}가 방향과 무관하게 같습니다`,
          ).toBe(texts.length);
        }
      }
    }
  });

  it("축마다 균형 문구가 서로 다릅니다", () => {
    // 네 축이 모두 0점이면 같은 문장이 네 번 나옵니다.
    const headlines = narrative.axes.map(
      (axis) =>
        axis.readings.find((reading) => reading.direction === "balanced")?.headline ?? "",
    );

    expect(new Set(headlines).size).toBe(headlines.length);
  });

  /**
   * 제목과 본문이 같은 말을 하면, 읽는 사람은 본문을 건너뜁니다.
   * 제목은 "어느 쪽으로 얼마나", 본문은 "그래서 실제로 어떤 모습인지"를 맡습니다.
   */
  it("제목과 본문이 같은 말을 되풀이하지 않습니다", () => {
    /** 두 글자 단위로 잘라 겹치는 정도를 봅니다. 한국어는 어절이 붙어 있어 이 방식이 안정적입니다. */
    const bigrams = (text: string): ReadonlySet<string> => {
      const letters = text.replace(/[^가-힣]/g, "");
      return new Set(
        Array.from({ length: Math.max(0, letters.length - 1) }, (_, i) => letters.slice(i, i + 2)),
      );
    };

    for (const axis of narrative.axes) {
      for (const reading of axis.readings) {
        const head = bigrams(reading.headline);
        if (head.size === 0) continue;
        const body = bigrams(reading.summary);

        const shared = [...head].filter((gram) => body.has(gram)).length;
        expect(
          shared / head.size,
          `${String(axis.axisId)}/${reading.intensityBandId}/${reading.direction}
  제목: ${reading.headline}
  본문: ${reading.summary}`,
        ).toBeLessThan(0.7);
      }
    }
  });

  it("축마다 반증 문구가 있습니다 (T3)", () => {
    for (const axis of narrative.axes) {
      expect(axis.counterEvidence.length, String(axis.axisId)).toBeGreaterThan(20);
      // 결과가 빗나갔을 때 의심할 조건을 제시해야 합니다.
      expect(axis.counterEvidence, String(axis.axisId)).toMatch(/다면|라면/);
    }
  });
});

/**
 * 축쌍 렌즈 — 6쌍 전부 (docs/PRD-result-v2.md 4.4)
 *
 * 네 축에서 만들 수 있는 쌍은 6개입니다. 하나라도 빠지면 해석 폭이 줄어듭니다.
 */
describe("축 조합 렌즈 (DEC-038 확장)", () => {
  it("네 축의 모든 쌍(6개)을 덮습니다", () => {
    const pairs = definition.axisCombinations.map((combination) =>
      [...combination.axisIds].map(String).sort().join("+"),
    );

    const expected: string[] = [];
    const ids = definition.axes.map((axis) => String(axis.id));
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        expected.push([ids[i], ids[j]].filter((id): id is string => id !== undefined).sort().join("+"));
      }
    }

    expect(pairs.sort()).toEqual(expected.sort());
  });

  it("조합마다 방향 네 가지를 모두 담습니다", () => {
    for (const combination of definition.axisCombinations) {
      expect(combination.readings, combination.id).toHaveLength(4);
    }
  });
});

describe("문항 맥락 태그 (Phase A)", () => {
  /** 이 검사가 쓰는 장면 어휘. 검사가 소유하며 엔진은 문자열로만 다룹니다 (DEC-004). */
  const ALLOWED_CONTEXTS = ["lesson", "guidance", "admin", "colleague", "family", "self"] as const;

  /** S4 자격 — 장면당 최소 문항 수와 장면 안 polarity 최대 비율 */
  const MIN_ITEMS_PER_CONTEXT = 3;
  const MAX_POLARITY_RATIO = 2;

  function tally(axisId: string): ReadonlyMap<string, { positive: number; negative: number }> {
    const byContext = new Map<string, { positive: number; negative: number }>();
    for (const question of definition.questions) {
      if (String(question.axisId) !== axisId) continue;
      const cell = byContext.get(question.context) ?? { positive: 0, negative: 0 };
      if (question.polarity === 1) cell.positive += 1;
      else cell.negative += 1;
      byContext.set(question.context, cell);
    }
    return byContext;
  }

  /** 장면 하나가 S4 비교 대상이 될 수 있는지. 묵종 편향이 장면 차이로 둔갑하지 않게 막습니다. */
  function qualifies(cell: { positive: number; negative: number }): boolean {
    const total = cell.positive + cell.negative;
    if (total < MIN_ITEMS_PER_CONTEXT) return false;
    const high = Math.max(cell.positive, cell.negative);
    const low = Math.min(cell.positive, cell.negative);
    if (low === 0) return false;
    return high / low <= MAX_POLARITY_RATIO;
  }

  it("모든 문항에 알려진 장면 태그가 붙어 있습니다", () => {
    for (const question of definition.questions) {
      expect(
        (ALLOWED_CONTEXTS as readonly string[]).includes(question.context),
        `${question.id}의 장면 "${question.context}"를 모릅니다`,
      ).toBe(true);
    }
  });

  it("장면 태그가 문항 본문이 아니라 메타데이터로만 존재합니다", () => {
    // 태그 낱말이 본문에 그대로 박혀 있으면 어휘 누수 검사와 뜻이 겹칩니다.
    for (const question of definition.questions) {
      expect(question.text).not.toContain(question.context);
    }
  });

  it("축별 S4 가용성이 감사 문서와 일치합니다", () => {
    // docs/content/teacher-style-v1-audit.md 3장의 판정 (DEC-048 이후)
    const expected: Readonly<Record<string, number>> = {
      "axis-energy": 2,
      "axis-lens": 3,
      "axis-decision": 2,
      "axis-rhythm": 3,
    };

    for (const [axisId, count] of Object.entries(expected)) {
      const qualifying = [...tally(axisId).values()].filter(qualifies).length;
      expect(qualifying, `${axisId}의 자격 장면 수`).toBe(count);
    }
  });

  it("네 축 모두 S4를 보고할 수 있습니다 (DEC-048)", () => {
    const reportable = definition.axes
      .map((axis) => String(axis.id))
      .filter((axisId) => [...tally(axisId).values()].filter(qualifies).length >= 2);

    expect(reportable).toHaveLength(4);
  });

  /**
   * 장면 프로파일 — DEC-048로 새로 열린 해석 틀
   *
   * 한 장면 안에 문항 3개 이상인 축이 둘 이상이면, 그 장면에서 축끼리 견줄 수 있습니다.
   * 네 축을 세로로 읽는 기존 틀과 달리 "이 장면에서의 나"를 가로로 읽습니다.
   */
  it("장면 프로파일을 만들 수 있는 장면이 5개입니다", () => {
    const axesByContext = new Map<string, string[]>();
    for (const axis of definition.axes) {
      for (const [context, cell] of tally(String(axis.id))) {
        if (cell.positive + cell.negative < MIN_ITEMS_PER_CONTEXT) continue;
        axesByContext.set(context, [...(axesByContext.get(context) ?? []), String(axis.id)]);
      }
    }

    const usable = [...axesByContext.entries()].filter(([, axes]) => axes.length >= 2);
    expect(usable.map(([context]) => context).sort()).toEqual([
      "admin",
      "colleague",
      "guidance",
      "lesson",
      "self",
    ]);
  });

  it("자격 장면은 polarity가 한쪽으로 몰려 있지 않습니다", () => {
    for (const axis of definition.axes) {
      for (const [context, cell] of tally(String(axis.id))) {
        if (!qualifies(cell)) continue;
        const high = Math.max(cell.positive, cell.negative);
        const low = Math.min(cell.positive, cell.negative);
        expect(
          high / low,
          `${String(axis.id)}/${context}가 ${cell.positive}:${cell.negative}로 치우쳤습니다`,
        ).toBeLessThanOrEqual(MAX_POLARITY_RATIO);
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
          band.directional
            ? ["negative", "positive"]
            : ["balanced", "negative", "positive"],
        );
      }
    }
  });

  it("교직 리듬은 축마다 한 문장으로 읽힙니다", () => {
    const narrative = definition.resultNarrative;
    if (narrative === undefined) throw new Error("결과 서술이 없습니다.");

    for (const axis of narrative.axes) {
      for (const reading of axis.readings) {
        expect(reading.rhythm.match(/[.!?]/g), reading.rhythm).toHaveLength(1);
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
    }
    for (const reading of rhythm?.readings ?? []) {
      expect(reading.rhythm).not.toMatch(/미루는 습관|마감을 못|마감이 밀/);
    }
    expect(narrative.scopeNote).toMatch(/말의 양/);
    expect(narrative.scopeNote).toMatch(/마감/);
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
      expect(profile.title, profile.title).toMatch(/교실$/);
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

  it("핵심 결과카드는 축 이름과 유형 라벨을 그대로 옮겨 적지 않습니다", () => {
    const axisTerms = definition.axes.flatMap((axis) => [
      axis.name,
      axis.positive.label,
      axis.positive.shortLabel,
      axis.negative.label,
      axis.negative.shortLabel,
    ]);

    for (const profile of definition.resultProfiles) {
      const core = `${profile.title} ${profile.oneLiner} ${profile.rhythm}`;
      for (const term of axisTerms) {
        expect(core, `${profile.title}: ${term}`).not.toContain(term);
      }
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

  it("축당 최대 절대 점수가 24점이고 구간이 이를 덮습니다", () => {
    for (const axis of definition.axes) {
      const count = definition.questions.filter((question) => question.axisId === axis.id).length;
      const maxAbs = count * 2; // 5점 척도의 최대 편차 2
      expect(maxAbs).toBe(24);

      const last = [...axis.intensityBands].sort((a, b) => a.maxAbsScore - b.maxAbsScore).at(-1);
      expect(last?.maxAbsScore).toBe(maxAbs);
    }
  });
});

describe("4렌즈 코드 (DEC-049)", () => {
  const poles = definition.axes.flatMap((axis) => [axis.positive, axis.negative]);

  it("여덟 극 모두에 글자가 있고 서로 겹치지 않습니다", () => {
    const codes = poles.map((pole) => pole.code);

    expect(codes).toHaveLength(8);
    expect(codes.every((code) => code !== undefined)).toBe(true);
    expect(new Set(codes).size).toBe(8);
  });

  it("글자가 자리 순서와 뜻이 맞습니다", () => {
    const byShortLabel = new Map(poles.map((pole) => [pole.shortLabel, pole.code]));

    expect(Object.fromEntries(byShortLabel)).toEqual({
      교류형: "G",
      몰입형: "D",
      실제형: "A",
      가능성형: "O",
      원칙형: "R",
      맥락형: "C",
      계획형: "M",
      유연형: "L",
    });
  });

  it("환산 글자와 4렌즈 글자가 한 개도 겹치지 않습니다", () => {
    // 겹치면 사용자가 같은 글자를 서로 반대 뜻으로 두 번 읽게 됩니다.
    // 예: 우리 M(계획)과 환산 쪽 글자가 같으면 화면에서 구별이 안 됩니다.
    const lensLetters = new Set(poles.map((pole) => pole.code));
    for (const pole of poles) {
      expect(lensLetters.has(pole.crosswalkCode), pole.shortLabel).toBe(false);
    }
  });

  it("어떤 조합으로도 금지된 네 글자 코드가 만들어지지 않습니다 (AGENTS.md 1.1)", () => {
    const [energy, lens, decision, rhythm] = definition.axes;
    const sides = (index: number) => {
      const axis = [energy, lens, decision, rhythm][index];
      return [axis?.positive.code ?? "", axis?.negative.code ?? ""];
    };

    const combinations: string[] = [];
    for (const a of sides(0))
      for (const b of sides(1))
        for (const c of sides(2)) for (const d of sides(3)) combinations.push(a + b + c + d);

    expect(combinations).toHaveLength(16);
    expect(new Set(combinations).size).toBe(16);

    for (const code of combinations) {
      expect(code, code).not.toMatch(/\b[EI][NS][TF][JP]\b/i);
    }
  });

  it("균형 자리 글자가 극 글자와 구별됩니다", () => {
    const balancedLetter = definition.typeCode?.balancedLetter;

    expect(balancedLetter).toBe("·");
    expect(poles.some((pole) => pole.code === balancedLetter)).toBe(false);
  });

  it("환산 안내에 근사임을 알리는 문구가 있습니다", () => {
    const crosswalk = definition.typeCode?.crosswalk;

    expect(crosswalk?.disclaimer).toBeTruthy();
    expect(crosswalk?.unavailableNote).toBeTruthy();
  });
});
