/**
 * 콘텐츠 패키지 — teacher-style-v1 (contentVersion 3.1.0)
 *
 * 2026-08-20 전면 개정. 검수안: docs/content/teacher-style-v1-revision.md
 *
 * 무엇이 바뀌었나
 *   - 축 4개를 다시 설계했습니다. 기존 `axis-order`는 `axis-design`과 `axis-decision`을
 *     섞어 놓은 축이라 독립 축이 아니었고, 그 때문에 결과 16칸이 고르게 나오지 않았습니다.
 *   - 새 4축은 서로 다른 영역을 하나씩 맡고, **축마다 전용 장면군**을 씁니다.
 *     같은 장면이 두 축에 나오지 않으므로 축 사이 겹침이 원천 차단됩니다.
 *   - 기존 `axis-change`(시도형/안정형)는 독립 축에서 빠지고,
 *     `axis-lens` × `axis-rhythm` 조합 해석(`axisCombinations`)으로 표현됩니다.
 *
 * 형식 규격: docs/content/teacher-style-v1.md
 *
 * 축 설계 원칙
 *   - 네 축이 서로 다른 것을 잰다
 *   - 양 끝 중 한쪽이 더 좋아 보이지 않는다
 *   - 교직 맥락에서 실제로 관찰되는 차이다
 *   - 기존 성격유형 검사의 명칭·유형 코드·축 이름을 쓰지 않는다 (AGENTS.md 1.1)
 */

/** 강도 구간 — DEC-002b 확정값. 축당 10문항 × 최대 편차 2 = 최대 20점 */
const intensityBands = [
  { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 4, directional: false },
  { id: "clear", label: "뚜렷", minAbsScore: 5, maxAbsScore: 12, directional: true },
  { id: "strong", label: "매우 뚜렷", minAbsScore: 13, maxAbsScore: 20, directional: true },
];

/**
 * 축 식별자. 엔진은 이 문자열만 알고, 사람이 읽는 이름은 아래 데이터가 소유합니다 (DEC-004).
 * 결과 키(pppp … nnnn)의 자리 순서도 이 배열 순서를 따릅니다.
 */
export const axisIds = ["axis-energy", "axis-lens", "axis-decision", "axis-rhythm"] as const;

const axes = [
  {
    id: "axis-energy",
    name: "힘을 얻는 방향",
    positive: {
      side: "positive",
      label: "함께 있을 때 채워지는 교류형",
      shortLabel: "교류형",
      description:
        "사람들 사이에 있을 때 생각이 정리되고 힘이 납니다. 옆 반 선생님과 나눈 짧은 대화가 다음 수업을 가볍게 만들어 줘요.",
    },
    negative: {
      side: "negative",
      label: "혼자 있을 때 채워지는 몰입형",
      shortLabel: "몰입형",
      description:
        "혼자 있는 시간에 힘이 채워집니다. 방해받지 않는 시간이 확보되면 그날 할 일이 훨씬 깊게 들어가요.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-lens",
    name: "먼저 눈에 들어오는 것",
    positive: {
      side: "positive",
      label: "눈앞의 사실부터 챙기는 실제형",
      shortLabel: "실제형",
      description:
        "지금 눈앞에 있는 사실과 구체적인 장면이 먼저 잡힙니다. 관찰한 것과 아이가 실제로 해낸 결과를 근거로 삼아요.",
    },
    negative: {
      side: "negative",
      label: "흐름과 가능성부터 보는 가능성형",
      shortLabel: "가능성형",
      description:
        "지금 모습보다 이것이 어디로 이어질지가 먼저 그려집니다. 세부보다 전체가 어떤 이야기인지를 먼저 보게 돼요.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-decision",
    name: "판단할 때 먼저 살피는 것",
    positive: {
      side: "positive",
      label: "기준을 먼저 세우는 원칙형",
      shortLabel: "원칙형",
      description:
        "누구에게나 같은 기준을 적용해, 아이들이 예외 없이 존중받는다고 느끼게 합니다. 기준이 흔들리지 않아 설명하기도 쉬워요.",
    },
    negative: {
      side: "negative",
      label: "사정을 먼저 살피는 맥락형",
      shortLabel: "맥락형",
      description:
        "같은 행동도 그 아이가 놓인 사정에 따라 다르게 봅니다. 지금 이 아이에게 무엇이 필요한지를 먼저 물어요.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-rhythm",
    name: "일을 굴리는 리듬",
    positive: {
      side: "positive",
      label: "미리 정해 두는 계획형",
      shortLabel: "계획형",
      description:
        "앞을 미리 정해 두어야 마음이 놓입니다. 다음에 무엇이 오는지 알기 때문에 교실이 예측 가능해져요.",
    },
    negative: {
      side: "negative",
      label: "열어 두고 맞추는 유연형",
      shortLabel: "유연형",
      description:
        "열어 두고 그때그때 맞춰 갑니다. 계획에 매이지 않기 때문에 마침 찾아온 좋은 순간을 놓치지 않아요.",
    },
    defaultPole: "positive",
    intensityBands,
  },
];

/**
 * 축 조합 해석 — 두 축이 만났을 때만 보이는 이야기입니다.
 *
 * 축을 늘리지 않고 해석만 늘리는 방법이라, 축 사이 겹침을 만들지 않으면서
 * 결과의 두께를 키울 수 있습니다. 검수안 2.5절에서 폐지한 `axis-change`(새로움)가
 * 첫 번째 조합으로 되살아납니다.
 */
const axisCombinations = [
  {
    id: "combo-novelty",
    title: "새로운 방법을 수업에 옮기는 방식",
    axisIds: ["axis-lens", "axis-rhythm"],
    readings: [
      {
        poles: { "axis-lens": "positive", "axis-rhythm": "positive" },
        text: "새 방법이 눈에 들어오면 필요한 준비물과 순서를 먼저 확인하고, 어느 수업에서 시도할지 정한 뒤 시작하는 편이에요. 구체적인 실행 조건이 갖춰졌을 때 움직이기 편할 수 있습니다.",
      },
      {
        poles: { "axis-lens": "positive", "axis-rhythm": "negative" },
        text: "바로 써 볼 수 있는 방법이 눈에 들어오면 작은 범위에서 먼저 시도하고, 아이들 반응을 보며 다음 방법을 정하는 편이에요. 시도 뒤에 짧게 기록해 두면 판단 근거를 남기기 좋습니다.",
      },
      {
        poles: { "axis-lens": "negative", "axis-rhythm": "positive" },
        text: "새로운 방법이 우리 반의 배움과 어디로 이어질지를 먼저 그려 보고, 의미가 분명해지면 학기 흐름 안에 자리를 마련하는 편이에요. 방향과 첫 실행 단계를 함께 적어 두면 생각을 옮기기 편합니다.",
      },
      {
        poles: { "axis-lens": "negative", "axis-rhythm": "negative" },
        text: "수업의 새로운 가능성이 떠오르면 큰 방향을 두고 작은 시도를 시작하는 편이에요. 시도한 뒤 무엇을 이어 가고 무엇을 멈출지 정리하면 다음 선택이 더 분명해질 수 있습니다.",
      },
    ],
  },
];

/**
 * Part는 화면 분량을 나누는 단위입니다. 축과 1:1로 대응하지 않습니다.
 * 안내 문구도 축을 짐작하게 하지 않도록 중립적으로 씁니다.
 */
export const sectionIds = ["part-1", "part-2", "part-3", "part-4"] as const;

const sections = [
  {
    id: "part-1",
    order: 1,
    title: "평소의 교실 리듬 떠올리기",
    description:
      "교실과 교무실에서 자주 보이는 평소 모습을 떠올려 보세요. 가장 바람직한 모습보다 요즘 자연스럽게 하는 쪽에 답하면 됩니다.",
  },
  {
    id: "part-2",
    order: 2,
    title: "수업과 관계의 장면 살피기",
    description:
      "수업을 준비하고 아이들과 관계를 맺는 장면을 생각해 보세요. 상황에 따라 달랐다면 더 자주 나타나는 쪽을 골라 주세요.",
  },
  {
    id: "part-3",
    order: 3,
    title: "결정과 협업 방식 돌아보기",
    description:
      "업무를 정리하고 동료와 함께 움직였던 최근 장면을 떠올려 보세요. 오래 분석하기보다 먼저 가까운 쪽을 골라 주세요.",
  },
  {
    id: "part-4",
    order: 4,
    title: "마지막 장면까지 연결하기",
    description:
      "이제 남은 장면을 이어 봅니다. 앞선 답과 맞추려 하지 말고, 각 문장을 새롭게 읽고 지금의 나에게 답해 주세요.",
  },
];

/** 응답 척도 — docs/content/teacher-style-v1.md 2절에서 확정된 값입니다. */
const scale = {
  id: "likert-5",
  centerValue: 3,
  options: [
    { value: 1, label: "전혀 그렇지 않다", visibleLabel: "전혀 그렇지 않다" },
    { value: 2, label: "그렇지 않은 편이다", visibleLabel: "그렇지 않은 편이다" },
    { value: 3, label: "보통이다", visibleLabel: "보통이다" },
    { value: 4, label: "그런 편이다", visibleLabel: "그런 편이다" },
    { value: 5, label: "매우 그렇다", visibleLabel: "매우 그렇다" },
  ],
};

export const teacherStyleV1Base = {
  id: "teacher-style",
  slug: "teacher-style",
  title: "나의 교직 스타일 탐색",
  summary: "질문으로 살펴보는 나의 교실 운영 스타일",
  description:
    "어디에서 힘을 얻고, 무엇이 먼저 눈에 들어오며, 판단할 때 무엇을 먼저 살피고, 일을 어떤 순서와 방식으로 이어 가는지 네 가지 관점으로 살펴봅니다. 맞고 틀린 답은 없고, 어느 쪽이 더 좋은 스타일인 것도 아니에요. 나와 동료가 서로 어떻게 다른지를 이야기해 보는 데 쓰시면 좋습니다.",
  estimatedMinutes: 5,
  status: "published",
  // 축과 문항이 통째로 바뀌었습니다. 버전을 올려야 예전 응답이 조용히 섞이지 않고
  // "새로 시작" 안내를 받습니다 (architecture 7.3).
  assessmentVersion: 3,
  contentVersion: "3.1.0",
  scale,
  axes,
  axisCombinations,
  sections,
  scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
};
