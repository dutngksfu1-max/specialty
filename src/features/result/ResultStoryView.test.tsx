import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResultStoryView } from "@/features/result/ResultStoryView";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

/**
 * 줄글 보기 회귀 방지 (DEC-069)
 *
 * 여기서 막는 것은 "예쁘게 보이는가"가 아니라 **피드백으로 받은 증상이 돌아오는가**입니다.
 * 순위 배지·분류어·강도 이름이 다시 들어오면 이 파일이 먼저 깨집니다.
 */

function renderStory(profileIndex: number) {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

  const profile = found.value.resultProfiles[profileIndex];
  if (profile === undefined) throw new Error("검사용 결과 프로필이 없습니다.");


  return {
    definition: found.value,
    profile,
    markup: renderToStaticMarkup(
      <ResultStoryView profile={profile} />,
    ),
  };
}

/** 성격 묘사 구역 이름. 구역이 늘면 여기 한 줄만 더합니다. */
const PORTRAIT_SECTIONS = [
  "opening",
  "classroomSigns",
  "inLessons",
  "withStudents",
  "fromKids",
  "drive",
  "misread",
  "whenTired",
] as const;

/**
 * 기능어만으로 된 3-gram은 겹쳐도 재진술이 아닙니다.
 * "몇 달 뒤", "쓸 수 있는" 같은 관용구까지 잡으면 멀쩡한 문장을 고치게 됩니다.
 */
const FUNCTION_WORDS = new Set(
  ("몇 달 뒤 쓸 수 있는 것 것을 것이 때 때는 더 잘 안 못 그 이 저 하는 되는 같은 " +
    "말 말을 일 일이 함께 먼저 다 한 그런 어떤 무슨 좀 바로 또 다시").split(" "),
);

/** 어절 3개 묶음. 이만큼 겹치면 사람이 읽었을 때 "아까 그 문장"으로 느낍니다. */
function triGrams(text: string): readonly string[] {
  const words = text
    .replace(/[.,"'“”‘’?!]/gu, "")
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  return words
    .slice(0, Math.max(words.length - 2, 0))
    .map((_, index) => words.slice(index, index + 3))
    .filter((gram) => gram.some((word) => !FUNCTION_WORDS.has(word)))
    .map((gram) => gram.join(" "));
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

describe("ResultStoryView", () => {
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

  it("분류 이름을 보여 주지 않습니다", () => {
    const { definition, markup } = renderStory(0);
    const text = visibleText(markup);

    for (const axis of definition.axes) {
      for (const pole of [axis.positive, axis.negative]) {
        // "몰입형" 같은 분류어는 화면에서 사라져야 합니다.
        expect(text).not.toContain(pole.shortLabel);
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

    /*
      결과 제목과 장면 문장도 같은 규칙을 받습니다.
      실제로 `아이를 살피고 미리 챙겨 두는 선생님`이라는 제목이 문항 문구를 그대로 쓰고 있었습니다.
    */
    for (const profile of found.value.resultProfiles) {
      const surfaces = [
        profile.title,
        profile.oneLiner,
        profile.rhythm,
        ...[...profile.shiningMoments, ...profile.underPressure, ...profile.withColleagues].map(
          (note) => `${note.situation} ${note.text}`,
        ),
        ...profile.collaboration.naturalFit,
        ...profile.collaboration.needsTuning,
        ...profile.nextSteps,
        ...profile.talkingPoints,
      ];
      for (const surface of surfaces) {
        for (const gram of triGrams(surface)) {
          expect(
            questionGrams.get(gram) ?? null,
            `${profile.key}의 결과 문장이 문항을 다시 썼습니다 — 겹친 대목 "${gram}"`,
          ).toBeNull();
        }
      }
    }

    // 축 원고도 같은 규칙을 받습니다. 문항을 바꿀 때 여기가 함께 어긋나기 쉽습니다.
    for (const axis of found.value.resultNarrative?.axes ?? []) {
      for (const reading of axis.readings) {
        const story = reading.story;
        if (story === undefined) continue;
        for (const paragraph of [story.lead, ...story.body]) {
          for (const gram of triGrams(paragraph)) {
            expect(
              questionGrams.get(gram) ?? null,
              `${String(axis.axisId)} ${reading.direction} 원고가 문항을 다시 썼습니다 — 겹친 대목 "${gram}"`,
            ).toBeNull();
          }
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

  /*
    한 축이 원고를 먹으면 "이 검사가 그것만 봤나" 하고 느낍니다.
    실제로 있었던 일입니다 — 어떤 유형은 '계획' 어휘가 60%, '기준·사정'은 0%였습니다.

    낱말 목록은 **축의 양극을 모두** 담아야 합니다. 계획 쪽 낱말만 넣으면 유연형 원고가
    전부 0으로 나오는데, 그건 원고가 아니라 자가 잘못된 것입니다.
  */
  const AXIS_WORDS: Readonly<Record<string, readonly string[]>> = {
    /*
      결과문에서 동료를 걷어내면서(DEC-074) 이 축의 어휘도 교실 쪽으로 옮겼습니다.
      축이 재는 것은 그대로입니다 — 말하며 정리하는가, 혼자 정리한 뒤에 말하는가.
    */
    "말하며·혼자": [
      "말로", "말을 주고받", "소리 내어", "되묻", "되물", "입 밖으로", "물어", "말을 겁니다",
      "혼자", "말수", "말이 적", "말을 줄이", "밖으로는", "조용히", "정리한 뒤",
    ],
    "관찰·앞날": [
      "기록", "적어 두", "적어 둔", "메모", "자료", "확인", "직접 본", "날짜", "사실",
      "몇 년 뒤", "몇 달 뒤", "앞으로", "다음 학년", "2학기", "학년 말", "12월",
      "예상", "변화", "지난번", "작년", "원인",
    ],
    "기준·사정": [
      "규칙", "기준", "사정", "아이에 따라", "아이마다", "일관", "예외",
      "설명할 수", "학부모", "억울", "답이 정해", "같은 답", "넘으면 안 되는",
      // 이 원고에서 원칙형을 나타내는 가장 흔한 말인데 빠져 있었습니다 (2026-09-09).
      // `넘으면 안 되는 선`에서 추상어 `선`을 걷어내자 이 축이 결손으로 잡혔습니다.
      "안 된다고 한", "안 되는지는", "11월에도", "학기 내내", "바꾸지 않",
    ],
    "계획·즉흥": [
      "계획", "미리", "순서", "마감", "일정", "학기 초", "금요일", "시간표", "진도",
      "그때그때", "그 자리에서", "하면서", "바로 바꾸", "지금 할 수 있는", "준비해",
      "밀리", "밀려", "손을 댑니다", "그날 하나",
      // 유연형 표현이 빠져 있어 그쪽 유형을 결손으로 잘못 잡았습니다 (2026-09-06).
      "일단 해 보", "해 보고 고", "다 준비하고 시작하지", "앞서", "손이 가",
    ],
  };

  it("성격 묘사가 네 축을 고르게 다룹니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;

      const counts = new Map<string, number>();
      const coverage = new Map<string, number>();

      for (const [axis, words] of Object.entries(AXIS_WORDS)) {
        let total = 0;
        let sections = 0;
        for (const name of PORTRAIT_SECTIONS) {
          const text = portrait[name].join(" ");
          const hits = words.reduce((sum, word) => sum + text.split(word).length - 1, 0);
          total += hits;
          if (hits > 0) sections += 1;
        }
        counts.set(axis, total);
        coverage.set(axis, sections);
      }

      const grand = [...counts.values()].reduce((sum, value) => sum + value, 0);
      expect(grand).toBeGreaterThan(0);

      for (const axis of Object.keys(AXIS_WORDS)) {
        // 여섯 구역 가운데 두 곳에도 안 나오면 그 축은 사실상 빠진 것입니다.
        expect(
          coverage.get(axis) ?? 0,
          `${profile.key}에서 '${axis}' 축이 거의 다뤄지지 않습니다`,
        ).toBeGreaterThanOrEqual(2);

        // 한 축이 절반을 넘으면 나머지 셋이 묻힙니다.
        expect(
          (counts.get(axis) ?? 0) / grand,
          `${profile.key}에서 '${axis}' 축이 원고를 독차지합니다`,
        ).toBeLessThan(0.5);
      }
    }
  });

  /*
    axis-energy 문항 12개 가운데 11개가 동료·혼자 장면입니다.
    동료와 말수가 적어도 아이들과는 하루 종일 떠드는 선생님이 많으므로,
    그 축을 아이 시점으로 옮겨 쓰면 결과가 통째로 틀립니다.
  */
  it("동료 앞에서의 모습을 아이 시점으로 옮겨 쓰지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    for (const profile of found.value.resultProfiles) {
      const portrait = profile.portrait;
      if (portrait === undefined) continue;

      const text = portrait.fromKids.join(" ");
      for (const word of ["말수", "말이 적", "회의", "교무실", "동료"]) {
        expect(
          text.includes(word),
          `${profile.key}의 아이 시점에 어른들 사이의 이야기("${word}")가 섞였습니다`,
        ).toBe(false);
      }
    }
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

  /*
    전수조사에서 드러난 구멍입니다 (2026-09-06).

    동료를 걷어낼 때(DEC-074) 쓴 낱말 목록에 `전담 선생님` `상담 선생님` `메신저`
    `협조` `협의` `다른 반보다`가 없었습니다. 그래서 검사는 0건이라고 했는데
    화면에는 남아 있었습니다. **자가 좁으면 통과는 아무 뜻이 없습니다.**
    새 표현을 발견하면 목록에 더해 주세요.
  */
  const ADULT_WORDS: readonly RegExp[] = [
    /동료/u,
    /옆 반/u,
    /교무실/u,
    /협의회|학년 협의/u,
    /회식/u,
    // `학급 회의`는 아이들과 하는 것이라 교실 장면입니다. 그 밖의 회의만 막습니다.
    /(?<!학급 )회의/u,
    /다른 선생님|전담 선생님|상담 선생님|주변 선생님/u,
    /동학년/u,
    /옆자리/u,
    /메신저/u,
    /협조/u,
    /어른들 사이/u,
    /선생님들/u,
    // `예상과 다른 반응`이 걸리지 않게, 옆 반과 견주는 표현만 막습니다.
    /다른 반 선생님|다른 반보다|다른 반과 견/u,
  ];

  /** 화면(히어로 + 줄글 보기)에 실제로 나오는 문장만 모읍니다. */
  function visibleProse(profile: {
    readonly title: string;
    readonly oneLiner: string;
    readonly rhythm: string;
    readonly portrait?: Readonly<Record<(typeof PORTRAIT_SECTIONS)[number], readonly string[]>>;
    readonly shiningMoments: readonly { readonly situation: string; readonly text: string }[];
    readonly underPressure: readonly { readonly situation: string; readonly text: string }[];
  }): readonly string[] {
    const portrait = profile.portrait;
    return [
      profile.title,
      profile.oneLiner,
      profile.rhythm,
      ...(portrait === undefined ? [] : PORTRAIT_SECTIONS.flatMap((name) => portrait[name])),
      ...[...profile.shiningMoments, ...profile.underPressure].map(
        (note) => `${note.situation} ${note.text}`,
      ),
    ];
  }

  it("화면에 나오는 문장에 동료가 등장하지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    for (const profile of found.value.resultProfiles) {
      for (const sentence of visibleProse(profile)) {
        for (const pattern of ADULT_WORDS) {
          expect(
            sentence,
            `${profile.key}: 결과는 교실만 다룹니다 — ${String(pattern)}`,
          ).not.toMatch(pattern);
        }
      }
    }
  });

  /*
    `상대는 잊혔다고 느낍니다` `밖에서는 괜찮아 보입니다` `듣는 쪽은 앞서간다고 느낍니다`.
    누가 그렇게 느끼는지가 빠져 있어서 한 번 읽고는 알 수 없고, 대개 그 자리에
    원래 동료가 있었습니다. 결과문에서 그렇게 느끼는 쪽은 아이·학부모뿐입니다.
  */
  const FACELESS = ["상대는", "상대가", "상대를", "밖에서는", "듣는 쪽", "주위에서는", "남들은"] as const;

  it("누가 그렇게 느끼는지를 비워 두지 않습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    for (const profile of found.value.resultProfiles) {
      for (const sentence of visibleProse(profile)) {
        for (const word of FACELESS) {
          expect(
            sentence.includes(word),
            `${profile.key}: 누가 그러는지를 적어 주세요 — "${word}" · ${sentence}`,
          ).toBe(false);
        }
      }
    }
  });

  /*
    장면은 `<상황>에는 <설명>` 한 문장으로 조립됩니다 (`SceneProse`).
    조사를 코드에서 붙이는 것은 위험합니다 — 예전에 `생활지도할 때에서도`처럼
    깨진 적이 있어 조립 자체를 걷어냈습니다. 여기서만 다시 허용하는 조건이
    **모든 상황이 `~ 때`로 끝나는 것**입니다. 그 조건을 검사로 붙들어 둡니다.
  */
  it("장면 이름이 문장 첫머리로 붙습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    for (const profile of found.value.resultProfiles) {
      for (const note of [...profile.shiningMoments, ...profile.underPressure]) {
        expect(
          note.situation,
          `${profile.key}: '${note.situation}에는'이 말이 되지 않습니다`,
        ).toMatch(/ 때$/u);

        /*
          이름을 첫머리로 옮기니 `챙길 아이가 여럿일 때에는 챙길 아이가 여러 명이면…`
          처럼 같은 말이 두 번 나오는 것이 드러났습니다. 앞 두 어절이 그대로
          되풀이되면 읽는 사람이 더듬습니다.
        */
        const head = note.situation.split(/\s+/u).slice(0, 2).join(" ");
        expect(
          note.text.startsWith(head),
          `${profile.key}: 장면 이름을 본문이 되풀이합니다 — "${head}"`,
        ).toBe(false);
      }
    }
  });

  it("장면 이름만 보고 어느 자리인지 알 수 있습니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    if (!found.ok) throw new Error("검사용 콘텐츠를 불러오지 못했습니다.");

    /*
      `수업 · 생활지도 · 상담 · 업무` 꼬리표는 화면에 안 나옵니다.
      그래서 상담 장면은 이름이 **누구와 마주 앉는 자리인지** 스스로 말해야 합니다.
      `앞일을 물어올 때`는 누가 물어보는지가 없어 상담인지 수업인지 알 수 없었습니다.
    */
    for (const profile of found.value.resultProfiles) {
      for (const note of [...profile.shiningMoments, ...profile.underPressure]) {
        if (note.scene !== "상담") continue;
        expect(
          /학부모|아이|상담/u.test(note.situation),
          `${profile.key}: 상담 장면 이름에 상대가 없습니다 — "${note.situation}"`,
        ).toBe(true);
      }
    }
  });

  it("점수가 0이어도 결과가 온전히 그려집니다", () => {
    // DEC-068을 그대로 따릅니다. 줄글 보기가 중립 상태를 되살리면 안 됩니다.
    const { profile, markup } = renderStory(0);
    const text = visibleText(markup);

    expect(text).toContain(profile.portrait?.opening[0] ?? profile.oneLiner);
    expect(text).not.toContain("판단 보류");
  });
});
