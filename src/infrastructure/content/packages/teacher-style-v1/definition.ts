/**
 * 콘텐츠 패키지 — teacher-style-v1 (실제 콘텐츠 초안)
 *
 * ⚠️ **검수가 필요한 초안입니다.** DEC-023(축 정의)·DEC-024(콘텐츠 작성)·DEC-020(검사 제목)이
 * `WAITING` 상태여서, 각 DEC의 추천안대로 개발자가 초안을 작성해 넣은 것입니다.
 * 문구를 고치려면 이 폴더의 세 파일(definition / questions / profiles)만 고치면 됩니다.
 * 엔진·화면 코드는 한 줄도 건드리지 않아도 됩니다.
 *
 * 형식 규격: docs/content/teacher-style-v1.md
 *
 * 축 설계 원칙 (같은 문서 3절)
 *   - 네 축이 서로 다른 것을 잰다
 *   - 양 끝 중 한쪽이 더 좋아 보이지 않는다
 *   - 교직 맥락에서 실제로 관찰되는 차이다
 *   - 기존 성격유형 검사의 축을 그대로 옮기지 않는다
 */

/** 강도 구간 — DEC-002b 확정값. 축당 10문항 × 최대 편차 2 = 최대 20점 */
const intensityBands = [
  { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 4 },
  { id: "clear", label: "뚜렷", minAbsScore: 5, maxAbsScore: 12 },
  { id: "strong", label: "매우 뚜렷", minAbsScore: 13, maxAbsScore: 20 },
];

/**
 * 축 식별자. 엔진은 이 문자열만 알고, 사람이 읽는 이름은 아래 데이터가 소유합니다 (DEC-004).
 * 결과 키(pppp … nnnn)의 자리 순서도 이 배열 순서를 따릅니다.
 */
export const axisIds = ["axis-design", "axis-order", "axis-decision", "axis-change"] as const;

const axes = [
  {
    id: "axis-design",
    name: "수업을 준비하는 방식",
    positive: {
      side: "positive",
      label: "미리 그려 두는 준비형",
      shortLabel: "준비형",
      description:
        "학기와 단원의 흐름을 앞서 그려 두고, 그 지도를 따라 하루를 운영해요. 다음에 무엇이 오는지 알기 때문에 교실이 예측 가능해집니다.",
    },
    negative: {
      side: "negative",
      label: "흐름을 따라가는 조율형",
      shortLabel: "조율형",
      description:
        "그날 교실에서 벌어지는 일을 보고 방향을 정해요. 계획에 매이지 않기 때문에 마침 찾아온 좋은 순간을 놓치지 않습니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-order",
    name: "교실의 질서를 세우는 방식",
    positive: {
      side: "positive",
      label: "약속을 먼저 세우는 구조형",
      shortLabel: "구조형",
      description:
        "규칙과 절차를 분명히 해 두고 모두가 같은 그림을 보게 해요. 무엇을 기대받는지 알 때 아이들이 편안해진다고 봅니다.",
    },
    negative: {
      side: "negative",
      label: "관계를 먼저 쌓는 관계형",
      shortLabel: "관계형",
      description:
        "규칙보다 먼저 아이와의 신뢰를 쌓아요. 마음이 이어지면 교실은 자연스럽게 정돈된다고 봅니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-decision",
    name: "결정할 때 먼저 보는 것",
    positive: {
      side: "positive",
      label: "같은 기준을 지키는 형평형",
      shortLabel: "형평형",
      description:
        "누구에게나 같은 기준을 적용해, 아이들이 예외 없이 존중받는다고 느끼게 해요. 기준이 흔들리지 않아 설명하기도 쉽습니다.",
    },
    negative: {
      side: "negative",
      label: "각자의 사정을 살피는 맥락형",
      shortLabel: "맥락형",
      description:
        "같은 행동도 그 아이가 놓인 사정에 따라 다르게 봐요. 지금 이 아이에게 무엇이 필요한지를 먼저 묻습니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-change",
    name: "새로운 방식을 대하는 태도",
    positive: {
      side: "positive",
      label: "먼저 해 보는 시도형",
      shortLabel: "시도형",
      description:
        "괜찮아 보이는 방법이 있으면 교실에서 직접 해 봐요. 해 보고 남는 것으로 다음 걸음을 정합니다.",
    },
    negative: {
      side: "negative",
      label: "해 오던 것을 다지는 안정형",
      shortLabel: "안정형",
      description:
        "이미 잘 되던 방식을 조금씩 다듬어 완성도를 높여요. 검증된 것을 깊게 가져가는 데서 힘이 나옵니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
];

/**
 * Part는 화면 분량을 나누는 단위입니다. 축과 1:1로 대응하지 않습니다.
 * 안내 문구도 축을 짐작하게 하지 않도록 중립적으로 씁니다.
 */
export const sectionIds = ["part-1", "part-2", "part-3", "part-4"] as const;

const sections = [
  { id: "part-1", order: 1, title: "Part 1", description: "정답은 없어요. 떠오르는 대로 골라 주세요." },
  { id: "part-2", order: 2, title: "Part 2", description: "요즘의 나를 기준으로 답해 주세요." },
  { id: "part-3", order: 3, title: "Part 3", description: "오래 고민하지 말고 첫 느낌대로 골라 주세요." },
  { id: "part-4", order: 4, title: "Part 4", description: "마지막 묶음이에요. 조금만 더 힘내 주세요." },
];

/** 응답 척도 — docs/content/teacher-style-v1.md 2절에서 확정된 값입니다. */
const scale = {
  id: "likert-5",
  centerValue: 3,
  options: [
    { value: 1, label: "전혀 그렇지 않다", visibleLabel: "전혀 그렇지 않다" },
    { value: 2, label: "그렇지 않다" },
    { value: 3, label: "보통이다" },
    { value: 4, label: "그렇다" },
    { value: 5, label: "매우 그렇다", visibleLabel: "매우 그렇다" },
  ],
};

export const teacherStyleV1Base = {
  id: "teacher-style",
  slug: "teacher-style",
  // DEC-020 대기 중 — 추천안이었던 제목을 초안으로 씁니다.
  title: "나의 교직 스타일 탐색",
  summary: "40문항으로 살펴보는 나의 교실 운영 스타일",
  description:
    "교실을 어떻게 준비하고, 질서를 어떻게 세우고, 무엇을 기준으로 결정하고, 새로운 것을 어떻게 대하는지 네 가지 축으로 살펴봅니다. 맞고 틀린 답은 없고, 어느 쪽이 더 좋은 스타일인 것도 아니에요. 나와 동료가 서로 어떻게 다른지를 이야기해 보는 데 쓰시면 좋습니다.",
  estimatedMinutes: 10,
  status: "published",
  // fixture(1)에서 실제 콘텐츠로 바뀌며 문항 구성이 완전히 달라졌습니다.
  // 버전을 올려야 예전 응답이 조용히 섞이지 않고 "새로 시작" 안내를 받습니다 (architecture 7.3).
  assessmentVersion: 2,
  contentVersion: "2.0.0",
  scale,
  axes,
  sections,
  scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
};
