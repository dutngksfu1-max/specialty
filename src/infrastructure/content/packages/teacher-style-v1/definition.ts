/**
 * 콘텐츠 패키지 — teacher-style-v1 (contentVersion 4.0.0)
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

/**
 * 강도 구간 — 5구간 (DEC-047 · DEC-048)
 *
 * 축당 12문항 × 최대 편차 2 = 최대 24점입니다.
 *
 * **균형 구간 0~5는 방향을 단정할지 말지를 가르는 안전장치입니다**(DEC-046).
 * 그래서 이 경계만은 범위 대비 비율(0~20%)을 그대로 유지하고, 방향이 정해진
 * 나머지 구간만 넷으로 쪼갭니다. 안전성은 그대로 두고 해상도만 올리는 방식입니다.
 *
 * **구간이 올라가면 확신이 아니라 구체성이 올라갑니다** (docs/PRD-result-v2.md 6.3).
 * "확실히 그렇습니다"가 아니라 "몇 개의 장면에서 나타나는가"가 달라집니다.
 * 검증 데이터 없이 5구간을 쓰는 것을 정당화하는 규율이므로, 문구를 고칠 때 반드시 지킵니다.
 *
 *   균형       0 ~ 5     방향을 정하지 않음
 *   조금 뚜렷   6 ~ 10    한 장면에서 보임
 *   뚜렷      11 ~ 14    여러 장면에서 비슷하게
 *   강함      15 ~ 19    장면이 바뀌어도 같은 선택
 *   매우 뚜렷  20 ~ 24    거의 모든 장면에서
 */
const intensityBands = [
  { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 5, directional: false },
  { id: "leaning", label: "조금 뚜렷", minAbsScore: 6, maxAbsScore: 10, directional: true },
  { id: "clear", label: "뚜렷", minAbsScore: 11, maxAbsScore: 14, directional: true },
  { id: "strong", label: "강함", minAbsScore: 15, maxAbsScore: 19, directional: true },
  { id: "defining", label: "매우 뚜렷", minAbsScore: 20, maxAbsScore: 24, directional: true },
];

/**
 * 축 식별자. 엔진은 이 문자열만 알고, 사람이 읽는 이름은 아래 데이터가 소유합니다 (DEC-004).
 * 결과 키(pppp … nnnn)의 자리 순서도 이 배열 순서를 따릅니다.
 */
export const axisIds = ["axis-energy", "axis-lens", "axis-decision", "axis-rhythm"] as const;

const axes = [
  {
    id: "axis-energy",
    name: "동료와 생각을 정리하는 방식",
    positive: {
      side: "positive",
      label: "대화하며 정리하는 교류형",
      shortLabel: "교류형",
      description:
        "동료와 이야기를 주고받을 때 생각이 정리되는 편입니다. 짧은 대화에서도 필요한 실마리를 찾고 다음 일을 이어 갑니다.",
    },
    negative: {
      side: "negative",
      label: "혼자 정리하는 몰입형",
      shortLabel: "몰입형",
      description:
        "혼자 생각할 시간이 있을 때 머릿속이 정리되는 편입니다. 방해받지 않는 시간에 필요한 내용을 차분히 검토합니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-lens",
    name: "아이와 수업을 이해하는 방식",
    positive: {
      side: "positive",
      label: "구체적인 사실을 보는 실제형",
      shortLabel: "실제형",
      description:
        "관찰한 장면과 구체적인 자료를 바탕으로 아이와 수업을 이해합니다. 실제로 확인한 변화와 결과를 중요한 근거로 삼습니다.",
    },
    negative: {
      side: "negative",
      label: "가능성과 흐름을 보는 가능성형",
      shortLabel: "가능성형",
      description:
        "현재 장면이 앞으로 어떻게 이어질지를 그리며 아이와 수업을 이해합니다. 개별 장면을 전체 흐름과 연결해 살핍니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-decision",
    name: "결정을 내리는 방식",
    positive: {
      side: "positive",
      label: "공통 기준을 세우는 원칙형",
      shortLabel: "원칙형",
      description:
        "여럿이 함께 이해하고 적용할 수 있는 기준을 먼저 세웁니다. 결정의 근거를 분명하게 설명하는 것을 중요하게 여깁니다.",
    },
    negative: {
      side: "negative",
      label: "개별 상황을 살피는 맥락형",
      shortLabel: "맥락형",
      description:
        "같은 일이라도 아이와 상황에 따라 필요한 판단이 다를 수 있다고 봅니다. 현재의 사정과 필요를 먼저 살핍니다.",
    },
    defaultPole: "positive",
    intensityBands,
  },
  {
    id: "axis-rhythm",
    name: "업무와 수업을 진행하는 방식",
    positive: {
      side: "positive",
      label: "미리 계획하는 계획형",
      shortLabel: "계획형",
      description:
        "순서와 준비를 미리 정한 뒤 업무와 수업을 진행합니다. 다음 단계를 예측할 수 있도록 계획을 구체화합니다.",
    },
    negative: {
      side: "negative",
      label: "현장에서 조정하는 유연형",
      shortLabel: "유연형",
      description:
        "큰 방향을 세운 뒤 현장 상황에 맞춰 방법을 조정합니다. 새로 확인한 정보와 반응을 진행 과정에 반영합니다.",
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
  {
    id: "combo-energy-decision",
    title: "판단을 정리하는 자리",
    axisIds: ["axis-energy", "axis-decision"],
    readings: [
      {
        poles: { "axis-energy": "positive", "axis-decision": "positive" },
        text: "결정할 일이 생기면 동료와 이야기하며 기준을 다듬어 가는 편이에요. 이야기 중에 정리된 기준은 회의 뒤 한 줄로 남겨 두면 다음에 같은 논의를 되풀이하지 않게 됩니다.",
      },
      {
        poles: { "axis-energy": "positive", "axis-decision": "negative" },
        text: "결정할 일이 생기면 관련된 사람들의 사정을 먼저 듣고 이야기 속에서 답을 찾아 가는 편이에요. 들은 이야기 가운데 무엇이 결정에 영향을 줬는지 남겨 두면 나중에 설명하기 쉬워집니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-decision": "positive" },
        text: "결정할 일이 생기면 혼자 기준을 정리한 뒤 꺼내 놓는 편이에요. 정리된 결론만 전하면 과정이 보이지 않을 수 있으니, 어떤 기준으로 판단했는지 함께 말해 두면 좋습니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-decision": "negative" },
        text: "결정할 일이 생기면 혼자 각자의 상황을 헤아려 본 뒤 답을 정하는 편이에요. 살펴본 사정이 밖에서는 보이지 않으므로, 왜 그렇게 정했는지 한마디 덧붙이면 오해가 줄어듭니다.",
      },
    ],
  },
  {
    id: "combo-energy-lens",
    title: "정보를 모으는 자리",
    axisIds: ["axis-energy", "axis-lens"],
    readings: [
      {
        poles: { "axis-energy": "positive", "axis-lens": "positive" },
        text: "동료와 이야기를 나누며 구체적인 사실을 모으는 편이에요. 다만 들은 이야기와 직접 확인한 것이 섞이기 쉬우니, 중요한 판단 앞에서는 어디서 온 정보인지 한 번 갈라 두면 좋습니다.",
      },
      {
        poles: { "axis-energy": "positive", "axis-lens": "negative" },
        text: "동료와 이야기하다가 앞으로의 가능성이 떠오르는 편이에요. 떠오른 생각 옆에 '무엇부터 해 볼지'를 한 줄 붙여 두면 이야기로만 끝나지 않습니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-lens": "positive" },
        text: "혼자 자료와 기록을 살피며 사실을 확인하는 편이에요. 확인이 꼼꼼한 만큼 어디까지 보면 충분한지 정하기 어려울 때가 있으니, 시작 전에 확인의 범위를 정해 두면 수월합니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-lens": "negative" },
        text: "혼자 생각을 이어 가며 앞으로의 그림을 그리는 편이에요. 그린 그림을 중간에 한 번 꺼내 보면, 혼자 멀리 간 부분을 일찍 확인할 수 있습니다.",
      },
    ],
  },
  {
    id: "combo-energy-rhythm",
    title: "일을 시작하는 자리",
    axisIds: ["axis-energy", "axis-rhythm"],
    readings: [
      {
        poles: { "axis-energy": "positive", "axis-rhythm": "positive" },
        text: "동료와 먼저 이야기해 순서를 맞춘 뒤 시작하는 편이에요. 맞춘 순서를 짧게 적어 두면 서로 기억이 다를 때 확인할 곳이 생깁니다.",
      },
      {
        poles: { "axis-energy": "positive", "axis-rhythm": "negative" },
        text: "동료와 이야기하며 그때그때 방법을 맞춰 가는 편이에요. 바뀐 내용을 한 곳에 모아 두면 나중에 합류한 사람도 흐름을 따라올 수 있습니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-rhythm": "positive" },
        text: "혼자 순서를 정리해 두고 시작하는 편이에요. 정리한 순서를 미리 나누면 동료가 자기 일정을 맞추기 쉬워집니다.",
      },
      {
        poles: { "axis-energy": "negative", "axis-rhythm": "negative" },
        text: "혼자 큰 방향만 잡고 상황에 맞춰 움직이는 편이에요. 지금 어디까지 왔는지 가끔 알리면, 함께 일하는 사람이 기다릴지 도울지 판단할 수 있습니다.",
      },
    ],
  },
  {
    id: "combo-lens-decision",
    title: "본 것을 판단으로 옮기는 자리",
    axisIds: ["axis-lens", "axis-decision"],
    readings: [
      {
        poles: { "axis-lens": "positive", "axis-decision": "positive" },
        text: "확인한 사실을 정해 둔 기준에 비추어 판단하는 편이에요. 근거와 기준이 함께 있으면 설명이 분명해지지만, 기록에 남지 않은 사정이 빠질 수 있다는 점은 살펴볼 만합니다.",
      },
      {
        poles: { "axis-lens": "positive", "axis-decision": "negative" },
        text: "확인한 사실을 보되 그 아이가 놓인 상황을 함께 헤아리는 편이에요. 같은 사실에도 다르게 판단한 이유를 적어 두면, 나중에 스스로도 되짚어 보기 좋습니다.",
      },
      {
        poles: { "axis-lens": "negative", "axis-decision": "positive" },
        text: "앞으로의 흐름을 그린 뒤 기준에 맞춰 정리하는 편이에요. 그림과 기준 사이가 벌어질 때가 있으니, 지금 확인할 수 있는 사실을 한 번 짚어 보면 도움이 됩니다.",
      },
      {
        poles: { "axis-lens": "negative", "axis-decision": "negative" },
        text: "앞으로의 가능성과 각자의 사정을 함께 보며 판단하는 편이에요. 두 가지 모두 겉으로 잘 드러나지 않으므로, 판단의 이유를 말로 옮겨 두면 전달이 쉬워집니다.",
      },
    ],
  },
  {
    id: "combo-decision-rhythm",
    title: "정한 것을 실행으로 옮기는 자리",
    axisIds: ["axis-decision", "axis-rhythm"],
    readings: [
      {
        poles: { "axis-decision": "positive", "axis-rhythm": "positive" },
        text: "기준을 세우고 순서를 정한 뒤 움직이는 편이에요. 준비가 갖춰졌을 때 힘이 나는 만큼, 예상 밖의 일이 생겼을 때 어디까지 조정할 수 있는지 미리 정해 두면 편합니다.",
      },
      {
        poles: { "axis-decision": "positive", "axis-rhythm": "negative" },
        text: "기준은 분명히 하되 방법은 상황에 맞춰 바꾸는 편이에요. 무엇이 바뀌지 않는 기준이고 무엇이 조정 가능한지 나눠 말하면 동료가 따라오기 쉽습니다.",
      },
      {
        poles: { "axis-decision": "negative", "axis-rhythm": "positive" },
        text: "각자의 사정을 살피되 진행은 정한 순서대로 이어 가는 편이에요. 사정을 반영해 순서를 바꿨다면 그 사실을 알려 두면 혼선이 줄어듭니다.",
      },
      {
        poles: { "axis-decision": "negative", "axis-rhythm": "negative" },
        text: "상황을 보며 판단도 방법도 함께 조정하는 편이에요. 두 가지가 동시에 움직이면 밖에서는 흐름이 보이지 않으므로, 다시 확인할 시점을 정해 두면 좋습니다.",
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
  // 48문항 기준. 이전에는 이 값(5)과 안내 문구(10분)가 서로 어긋나 있어 함께 맞췄습니다.
  estimatedMinutes: 12,
  status: "published",
  // 축과 문항이 통째로 바뀌었습니다. 버전을 올려야 예전 응답이 조용히 섞이지 않고
  // "새로 시작" 안내를 받습니다 (architecture 7.3).
  assessmentVersion: 4,
  contentVersion: "4.0.0",
  scale,
  axes,
  axisCombinations,
  sections,
  scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
};
