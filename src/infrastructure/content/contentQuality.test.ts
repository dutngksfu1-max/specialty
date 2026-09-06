import { describe, expect, it } from "vitest";

import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

/**
 * 콘텐츠 품질 감사 (DEC-071)
 *
 * `realContent.test.ts`가 문항의 **형식**(길이·polarity·장면 태그)을 지킨다면,
 * 이 파일은 문항이 **무엇을 재고 있는지**를 지킵니다.
 *
 * 왜 필요한가 — 검사 이름은 "교직 스타일"인데 한 축(결과의 4분의 1)이 통째로
 * "어른들 사이에서 외향이냐 내향이냐"를 재고 있었던 적이 있습니다.
 * 문항 하나하나는 다 멀쩡해 보였고, 형식 검사도 전부 통과했습니다.
 * 축 단위로 세어 보고 나서야 드러났습니다. 그런 종류의 실수는 눈으로 못 잡습니다.
 */

const parsed = parseAssessmentDefinition(teacherStyleV1Package);
if (!parsed.ok) {
  throw new Error(`콘텐츠 검증 실패: ${parsed.error.detail ?? ""}`);
}
const definition = parsed.value;

/** 어른들 사이의 장면. 교직 스타일 검사에서 여기 무게가 실리면 안 됩니다. */
const ADULT_CONTEXTS: readonly string[] = ["colleague", "self"];

/** 문장에 학교가 실제로 들어 있는지 보는 낱말들 */
const SCHOOL_WORDS: readonly string[] = [
  "아이", "학생", "수업", "단원", "학급", "교실", "진도", "평가", "상담",
  "담임", "학년", "학교", "학부모", "공문", "급식", "알림장", "연수",
  "교재", "행사", "결재", "서류", "학기", "다툼",
];

function questionsOf(axisId: string) {
  return definition.questions.filter((question) => String(question.axisId) === axisId);
}

describe("교직 스타일 검사가 교직을 재고 있는가", () => {
  it("어른들 사이의 장면이 전체의 15%를 넘지 않습니다", () => {
    const adult = definition.questions.filter((question) =>
      ADULT_CONTEXTS.includes(question.context),
    );

    /*
      DEC-071 이전에는 35%였습니다. axis-energy 12문항 가운데 11개가
      동료·혼자 장면이었고, "방학이 길어지면 동료가 보고 싶다"처럼
      학교를 빼도 그대로 성립하는 문항이 그 안에 있었습니다.
    */
    expect(
      adult.length / definition.questions.length,
      `어른들 사이의 장면이 ${adult.length}/${definition.questions.length}개입니다`,
    ).toBeLessThanOrEqual(0.15);
  });

  it("한 축이 어른들 사이의 장면으로 기울지 않습니다", () => {
    for (const axis of definition.axes) {
      const mine = questionsOf(String(axis.id));
      const adult = mine.filter((question) => ADULT_CONTEXTS.includes(question.context));

      // 한 축의 3분의 1을 넘으면 그 축은 교실이 아니라 교무실을 재기 시작합니다.
      expect(
        adult.length / mine.length,
        `${String(axis.id)}의 어른 장면이 ${adult.length}/${mine.length}개입니다`,
      ).toBeLessThanOrEqual(0.34);
    }
  });

  it("교실·학교가 등장하는 문항이 절반을 넘습니다", () => {
    const grounded = definition.questions.filter((question) =>
      SCHOOL_WORDS.some((word) => question.text.includes(word)),
    );

    expect(
      grounded.length / definition.questions.length,
      `학교가 등장하는 문항이 ${grounded.length}/${definition.questions.length}개입니다`,
    ).toBeGreaterThan(0.5);
  });

  it("학교를 빼도 그대로 성립하는 문항이 10개를 넘지 않습니다", () => {
    /*
      0개를 요구하지는 않습니다. "할 일의 순서는 그날 상황을 보고 정한다"처럼
      교직 장면으로 옮기면 오히려 부자연스러워지는 문항이 있습니다.
      다만 그런 문항이 늘어나기 시작하면 검사가 일반 성격검사로 흘러가는 신호입니다.
    */
    const bare = definition.questions.filter(
      (question) => !SCHOOL_WORDS.some((word) => question.text.includes(word)),
    );

    expect(
      bare.length,
      `학교가 안 나오는 문항 ${bare.length}개: ${bare.map((question) => question.text).join(" / ")}`,
    ).toBeLessThanOrEqual(10);
  });

  it("모든 축이 아이 또는 수업 장면을 실제로 묻습니다", () => {
    // 한 축이라도 교실을 안 물으면, 그 축의 결과 문장은 교실 이야기를 할 근거가 없습니다.
    for (const axis of definition.axes) {
      const classroom = questionsOf(String(axis.id)).filter((question) =>
        ["lesson", "guidance"].includes(question.context),
      );

      expect(
        classroom.length,
        `${String(axis.id)}에 교실 장면 문항이 ${classroom.length}개뿐입니다`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("문항이 서로를 대신하지 않는가", () => {
  /** 어절 두 개 묶음 */
  function biGrams(text: string): ReadonlySet<string> {
    const words = text
      .replace(/[.,]/gu, "")
      .split(/\s+/u)
      .filter((word) => word.length > 0);
    return new Set(words.slice(0, Math.max(words.length - 1, 0)).map((_, index) => words.slice(index, index + 2).join(" ")));
  }

  function overlap(left: string, right: string): number {
    const a = biGrams(left);
    const b = biGrams(right);
    if (a.size === 0 || b.size === 0) return 0;
    const shared = [...a].filter((gram) => b.has(gram)).length;
    return shared / (a.size + b.size - shared);
  }

  it("같은 축·같은 방향 문항이 서로 베끼지 않습니다", () => {
    /*
      **이 검사가 못 잡는 것을 먼저 적어 둡니다.**

      `energy-16`("아이를 지도하기 전에 무슨 말을 할지 혼자 정리하고 부르는 편이다")과
      당시의 `energy-21`("아이들에게 공지할 내용은 머릿속에서 문장을 다 만든 뒤에 꺼내는 편이다")은
      사실상 같은 행동을 두 번 물었지만, **낱말이 달라서 이 검사에 걸리지 않았습니다.**
      뜻이 겹치는 중복은 사람이 읽어야 잡힙니다. 여기서 막는 것은 낱말이 겹치는 쪽입니다.
    */
    const byAxis = new Map<string, { id: string; text: string; polarity: number }[]>();
    for (const question of definition.questions) {
      const key = `${String(question.axisId)}:${question.polarity}`;
      byAxis.set(key, [
        ...(byAxis.get(key) ?? []),
        { id: question.id, text: question.text, polarity: question.polarity },
      ]);
    }

    for (const [key, group] of byAxis) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const left = group[i];
          const right = group[j];
          if (left === undefined || right === undefined) continue;
          expect(
            overlap(left.text, right.text),
            `${key}의 ${left.id}와 ${right.id}가 너무 닮았습니다
  ${left.text}
  ${right.text}`,
          ).toBeLessThan(0.25);
        }
      }
    }
  });
});

describe("소개 문구가 검사 내용과 어긋나지 않는가", () => {
  it("소개 문구에 적힌 관점 이름이 실제 축 이름과 같습니다", () => {
    /*
      축 이름을 고치고 소개 문구를 안 고치면, 사용자는 검사 전과 후에
      다른 이름을 보게 됩니다. 실제로 axis-energy 이름을 바꿨을 때 그럴 뻔했습니다.
    */
    for (const axis of definition.axes) {
      const stale = `동료와 ${axis.name}`;
      expect(
        definition.description.includes(stale),
        `소개 문구에 옛 축 이름("${stale}")이 남아 있습니다`,
      ).toBe(false);
    }

    // 네 축 가운데 적어도 절반은 소개 문구에 그대로 등장해야 합니다.
    const mentioned = definition.axes.filter((axis) =>
      definition.description.includes(axis.name),
    );
    expect(mentioned.length, "소개 문구가 가리키는 축").toBeGreaterThanOrEqual(2);
  });

  it("Part 안내가 이제는 없는 장면을 가리키지 않습니다", () => {
    const contexts = new Set(definition.questions.map((question) => question.context));
    const sectionText = definition.sections.map((section) => section.description ?? "").join(" ");

    // 동료 장면이 거의 없어졌는데 안내문이 "동료와 함께 움직였던 장면"을 떠올리라고 하면 안 됩니다.
    if (!contexts.has("colleague")) {
      expect(sectionText.includes("동료와 함께")).toBe(false);
    }
    expect(sectionText.includes("교무실")).toBe(false);
  });
});

/**
 * 문체 감사 (DEC-069)
 *
 * 참고한 타 검사 결과문에서 뽑은 특징을 우리 원고가 실제로 갖고 있는지 셉니다.
 * "참고했다"는 말은 검증이 안 되지만, 표지 개수는 검증됩니다.
 *
 * 참고 문서와 **일부러 다르게 한 것**도 있습니다. 참고 문서는 비유("인생은 거대한
 * 체스 경기")와 긴 연결문을 쓰지만, 우리는 쓰지 않습니다. 사용자가
 * "추상적 언어는 해석에 시간이 걸린다, 바로바로 읽혀야 한다"고 정했기 때문입니다.
 */
describe("결과문이 참고한 문체를 실제로 갖고 있는가", () => {
  const portraits = definition.resultProfiles.flatMap((profile) => {
    const portrait = profile.portrait;
    return portrait === undefined
      ? []
      : [
          {
            key: String(profile.key),
            text: [
              ...portrait.opening,
              ...portrait.classroomSigns,
              ...portrait.fromKids,
              ...portrait.drive,
              ...portrait.misread,
              ...portrait.whenTired,
            ].join(" "),
          },
        ];
  });

  function hits(text: string, patterns: readonly string[]): number {
    return patterns.reduce((sum, pattern) => sum + (text.split(pattern).length - 1), 0);
  }

  /** "~라는 오해를 받지만 실은" — 참고 문서에서 공감을 만드는 가장 강한 장치 */
  const MISREAD = ["아니라", "하지만", "그렇다고", "처럼 보이", "오해", "는 말을 듣", "는 소리를 듣"];
  /** "~때문입니다" — 무엇을 하는가가 아니라 왜 그러는가 */
  const MOTIVE = ["때문입니다", "때문에", "려는 것입니다", "위해서입니다", "어서입니다", "중요하게 여깁니다"];
  /** 감정을 인정하는 말. 이게 빠지면 관찰 기록이 되고 남 이야기로 읽힙니다 */
  /*
    ⚠️ 이 목록이 좁으면 멀쩡한 문장을 고치게 됩니다.
    `자신에게 실망합니다`를 `스스로 아쉬워집니다`로 다듬었더니 이 검사가 깨졌는데,
    문장이 나빠진 것이 아니라 `아쉬`가 목록에 없었을 뿐이었습니다.
    감정을 나타내는 말을 새로 쓰면 여기에도 더해 주세요.
  */
  const FEELING = [
    "지칩니다", "무거워", "조바심", "실망", "보람", "견디기 어려", "부담",
    "답답", "아깝", "편치 않", "자책", "피로", "힘이 빠", "살아납니다", "마음이",
    "아쉬", "조급", "속상", "마음에 걸", "불편",
  ];

  it("열여섯 유형 모두 오해·동기·감정을 한 번씩은 말합니다", () => {
    expect(portraits).toHaveLength(16);

    for (const { key, text } of portraits) {
      expect(hits(text, MISREAD), `${key}에 오해를 뒤집는 대목이 없습니다`).toBeGreaterThan(0);
      expect(hits(text, MOTIVE), `${key}에 왜 그러는지가 없습니다`).toBeGreaterThan(0);
      expect(hits(text, FEELING), `${key}에 감정을 인정하는 대목이 없습니다`).toBeGreaterThan(0);
    }
  });

  it("줄글 원고의 종결어미가 섞이지 않습니다", () => {
    /*
      기존 요약·자세히 보기는 해요체를 씁니다(`headline`·`summary`).
      줄글 보기는 참고 문서처럼 합쇼체로 통일했습니다. 한 화면에서 두 말투가 섞이면
      글이 누구 목소리인지 흔들립니다.
    */
    const soft = ["해요.", "에요.", "예요.", "어요."];
    for (const { key, text } of portraits) {
      expect(hits(text, soft), `${key}의 성격 묘사에 해요체가 섞였습니다`).toBe(0);
    }

    for (const axis of definition.resultNarrative?.axes ?? []) {
      for (const reading of axis.readings) {
        const story = reading.story;
        if (story === undefined) continue;
        const text = [story.lead, ...story.body].join(" ");
        expect(
          hits(text, soft),
          `${String(axis.axisId)} ${reading.direction} 원고에 해요체가 섞였습니다`,
        ).toBe(0);
      }
    }
  });
});
