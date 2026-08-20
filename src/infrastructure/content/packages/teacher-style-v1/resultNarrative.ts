/**
 * 방향·강도·균형을 함께 반영하는 결과 상단 서술 (DEC-046).
 *
 * 한 축당 균형 1개, 방향 2개 × 강도 2개를 둡니다.
 * 문장은 해당 축이 실제로 물은 맥락 안에서만 설명합니다.
 */
export const resultNarrative = {
  balancedTitle: "상황에 맞춰 폭넓게 움직이는 교직 리듬",
  balancedOneLiner:
    "네 가지 관점에서 서로 다른 방식을 고르게 활용하는 모습이 나타납니다.",
  balancedAxisNote:
    "상황에 따라 두 방식을 폭넓게 활용하는 관점도 함께 나타납니다.",
  scopeNote: "이 검사는 학생과 나누는 말의 양이나 마감을 지키는 습관을 평가하지 않습니다.",
  balancedGuidance: {
    shiningMoments: [
      {
        scene: "수업",
        text: "두 방식 가운데 어느 쪽을 선택했는지 실제 장면을 떠올리고, 선택이 달라진 조건이 있었는지 확인해 보세요.",
      },
      {
        scene: "업무",
        text: "한쪽 방식으로 단정하기보다, 업무의 성격에 따라 달라진 선택과 그 근거를 살펴보세요.",
      },
      {
        scene: "생활지도",
        text: "아이와 상황에 따라 판단이 달라졌다면, 관찰한 사실과 결정 이유를 나누어 기록해 보세요.",
      },
    ],
    underPressure: [
      {
        scene: "업무",
        text: "바쁠 때 평소보다 한쪽 방식만 반복해서 선택하지 않았는지 살펴볼 수 있어요.",
      },
      {
        scene: "동료",
        text: "상황마다 선택이 달라질 때에는 무엇을 기준으로 바꿨는지 설명하지 않으면 동료가 판단 과정을 알기 어려울 수 있어요.",
      },
    ],
    withColleagues: [
      {
        scene: "동료",
        text: "같은 사람도 회의, 수업 준비, 급한 대응에서 편한 방식이 달라질 수 있음을 대화의 출발점으로 삼아 보세요.",
      },
      {
        scene: "업무",
        text: "이번 일에서 필요한 방식과 다시 판단할 시점을 먼저 맞추면 역할을 나누기 쉬워요.",
      },
    ],
    collaboration: {
      naturalFit: [
        "어느 한쪽 이름에 맞추기보다, 이번 장면에서 자연스러웠던 방식과 그 이유를 나누기 쉬워요.",
        "서로 다른 방식을 사용해 본 경험이 있다면, 각 장면의 조건을 비교해 공통점을 찾아보세요.",
      ],
      needsTuning: [
        "균형 결과가 언제나 중간을 택한다는 뜻은 아니므로, 이번 일에서 선호하는 방식은 따로 말해 두세요.",
        "상황에 따라 방법을 바꿨다면 바꾼 이유와 다시 확인할 시점을 함께 알려 주세요.",
      ],
    },
    nextSteps: [
      "균형으로 나온 관점 하나를 골라, 최근 각 방식을 사용한 장면이 있는지 적어 보세요.",
      "두 장면에서 선택이 달라진 조건을 한 가지씩 표시해 보세요.",
      "다음 비슷한 일이 생기면 무엇을 먼저 확인할지 정해 보세요.",
    ],
    talkingPoints: [
      "같은 일에서도 상황에 따라 다른 방식을 쓴 적이 있나요?",
      "두 방식 중 하나를 더 선호하게 되는 조건은 무엇인가요?",
      "동료에게 내 선택의 이유를 어떻게 설명하나요?",
    ],
  },
  axes: [
    {
      axisId: "axis-energy",
      readings: [
        {
          intensityBandId: "balanced",
          direction: "balanced",
          headline: "대화 속에서 생각을 정리하는 편",
          summary: "동료와 이야기를 나누며 생각과 힘을 정리하는 편이에요.",
          rhythm: "동료와 의견을 주고받으며 생각과 힘을 정리하는 편입니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "positive",
          headline: "대화 속에서 생각을 정리하는 편",
          summary: "동료와 이야기를 나누며 생각과 힘을 정리하는 편이에요.",
          rhythm: "동료와 의견을 주고받으며 생각과 힘을 정리하는 편입니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "negative",
          headline: "혼자 정리하며 힘을 회복하는 편",
          summary: "혼자 집중하고 정리하며 생각과 힘을 모으는 편이에요.",
          rhythm: "방해받지 않고 혼자 정리하며 생각과 힘을 모으는 편입니다.",
        },
        {
          intensityBandId: "clear",
          direction: "positive",
          headline: "대화 속에서 생각을 정리하는 편",
          summary: "동료와 이야기를 나눌 때 생각과 힘이 정리되는 경향이 보여요.",
          rhythm: "동료와 의견을 주고받을 때 생각과 힘이 정리되는 편입니다.",
        },
        {
          intensityBandId: "clear",
          direction: "negative",
          headline: "혼자 정리하며 힘을 회복하는 편",
          summary: "방해받지 않고 혼자 정리할 때 생각과 힘이 모이는 경향이 보여요.",
          rhythm: "방해받지 않고 혼자 정리할 때 생각과 힘이 모이는 편입니다.",
        },
        {
          intensityBandId: "strong",
          direction: "positive",
          headline: "동료와 나눌 때 힘이 또렷해지는 편",
          summary: "동료와 의견을 주고받는 과정에서 생각과 힘을 얻는 경향이 매우 뚜렷해요.",
          rhythm: "특히 동료와 의견을 주고받는 과정에서 생각과 힘이 또렷해집니다.",
        },
        {
          intensityBandId: "strong",
          direction: "negative",
          headline: "혼자 몰입할 때 힘이 또렷해지는 편",
          summary: "혼자 집중하고 정리하는 시간에서 힘을 얻는 경향이 매우 뚜렷해요.",
          rhythm: "특히 혼자 집중하고 정리하는 시간에서 생각과 힘이 또렷해집니다.",
        },
      ],
    },
    {
      axisId: "axis-lens",
      readings: [
        {
          intensityBandId: "balanced",
          direction: "balanced",
          headline: "관찰한 사실에서 출발하는 편",
          summary: "관찰한 장면과 구체적인 자료를 먼저 살피는 편이에요.",
          rhythm: "아이와 수업을 볼 때 관찰한 장면과 구체적인 자료에서 출발합니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "positive",
          headline: "관찰한 사실에서 출발하는 편",
          summary: "관찰한 장면과 구체적인 자료를 먼저 살피는 편이에요.",
          rhythm: "아이와 수업을 볼 때 관찰한 장면과 구체적인 자료에서 출발합니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "negative",
          headline: "앞으로 이어질 가능성을 먼저 보는 편",
          summary: "현재 장면이 앞으로 어디로 이어질지를 먼저 그리는 편이에요.",
          rhythm: "아이와 수업을 볼 때 현재 장면이 앞으로 어디로 이어질지 먼저 그려 봅니다.",
        },
        {
          intensityBandId: "clear",
          direction: "positive",
          headline: "관찰한 사실에서 출발하는 편",
          summary: "관찰한 장면과 구체적인 자료를 먼저 살피는 경향이 보여요.",
          rhythm: "아이와 수업을 볼 때는 관찰한 장면과 구체적인 자료에서 출발합니다.",
        },
        {
          intensityBandId: "clear",
          direction: "negative",
          headline: "앞으로 이어질 가능성을 먼저 보는 편",
          summary: "현재 장면이 앞으로 어디로 이어질지를 먼저 그리는 경향이 보여요.",
          rhythm: "아이와 수업을 볼 때는 현재 장면이 앞으로 어디로 이어질지 먼저 그려 봅니다.",
        },
        {
          intensityBandId: "strong",
          direction: "positive",
          headline: "구체적인 장면을 근거로 삼는 경향이 뚜렷한 편",
          summary: "관찰한 사실과 구체적인 자료를 먼저 살피는 경향이 매우 뚜렷해요.",
          rhythm: "아이와 수업을 볼 때 구체적인 장면과 자료를 우선하는 모습이 선명합니다.",
        },
        {
          intensityBandId: "strong",
          direction: "negative",
          headline: "앞으로 이어질 흐름을 그리는 경향이 뚜렷한 편",
          summary: "현재보다 앞으로 이어질 흐름과 가능성을 먼저 보는 경향이 매우 뚜렷해요.",
          rhythm: "아이와 수업을 볼 때 앞으로 이어질 흐름과 가능성을 우선하는 모습이 선명합니다.",
        },
      ],
    },
    {
      axisId: "axis-decision",
      readings: [
        {
          intensityBandId: "balanced",
          direction: "balanced",
          headline: "정한 기준을 바탕으로 판단하는 편",
          summary: "여럿이 함께 이해할 수 있는 기준을 먼저 확인하는 편이에요.",
          rhythm: "결정에서는 여럿이 함께 이해할 수 있는 기준에 먼저 무게를 둡니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "positive",
          headline: "정한 기준을 바탕으로 판단하는 편",
          summary: "여럿이 함께 이해할 수 있는 기준을 먼저 확인하는 편이에요.",
          rhythm: "결정에서는 여럿이 함께 이해할 수 있는 기준에 먼저 무게를 둡니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "negative",
          headline: "상황과 사정을 살펴 판단하는 편",
          summary: "같은 일도 각자가 놓인 상황과 사정을 먼저 살피는 편이에요.",
          rhythm: "결정에서는 같은 일이라도 각자가 놓인 상황과 사정을 먼저 살핍니다.",
        },
        {
          intensityBandId: "clear",
          direction: "positive",
          headline: "정한 기준을 바탕으로 판단하는 편",
          summary: "여럿이 함께 이해할 수 있는 기준을 먼저 확인하는 경향이 보여요.",
          rhythm: "결정에서는 여럿이 함께 이해할 수 있는 기준에 먼저 무게를 둡니다.",
        },
        {
          intensityBandId: "clear",
          direction: "negative",
          headline: "상황과 사정을 살펴 판단하는 편",
          summary: "같은 일도 각자가 놓인 상황과 사정을 먼저 살피는 경향이 보여요.",
          rhythm: "결정에서는 같은 일이라도 각자가 놓인 상황과 사정을 먼저 살핍니다.",
        },
        {
          intensityBandId: "strong",
          direction: "positive",
          headline: "일관된 기준으로 판단하는 경향이 뚜렷한 편",
          summary: "여럿에게 설명할 수 있는 일관된 기준을 우선하는 경향이 매우 뚜렷해요.",
          rhythm: "결정에서는 여럿에게 설명할 수 있는 일관된 기준에 무게를 두는 쪽이 분명합니다.",
        },
        {
          intensityBandId: "strong",
          direction: "negative",
          headline: "각자의 상황을 반영하는 경향이 뚜렷한 편",
          summary: "같은 일도 각자가 놓인 상황과 사정을 우선하는 경향이 매우 뚜렷해요.",
          rhythm: "결정에서는 같은 일도 각자가 놓인 상황과 사정에 무게를 두는 쪽이 분명합니다.",
        },
      ],
    },
    {
      axisId: "axis-rhythm",
      readings: [
        {
          intensityBandId: "balanced",
          direction: "balanced",
          headline: "미리 정해 두어 흐름을 만드는 편",
          summary: "순서와 준비를 미리 정해 두고 일을 이어 가는 편이에요.",
          rhythm: "업무와 수업은 순서와 준비를 미리 정해 두고 시작하는 편입니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "positive",
          headline: "미리 정해 두어 흐름을 만드는 편",
          summary: "순서와 준비를 미리 정해 두고 일을 이어 가는 편이에요.",
          rhythm: "업무와 수업은 순서와 준비를 미리 정해 두고 시작하는 편입니다.",
        },
        {
          intensityBandId: "balanced",
          direction: "negative",
          headline: "상황에 맞춰 방법을 조정하는 편",
          summary: "큰 방향을 두고 현장에서 방법을 조정하는 편이에요.",
          rhythm: "업무와 수업은 큰 방향을 두되 현장에서 방법을 조정하며 이어 갑니다.",
        },
        {
          intensityBandId: "clear",
          direction: "positive",
          headline: "미리 정해 두어 흐름을 만드는 편",
          summary: "순서와 준비를 미리 정해 두고 일을 이어 가는 경향이 보여요.",
          rhythm: "업무와 수업은 순서와 준비를 미리 정해 두고 시작하는 편입니다.",
        },
        {
          intensityBandId: "clear",
          direction: "negative",
          headline: "상황에 맞춰 방법을 조정하는 편",
          summary: "큰 방향을 두고 현장에서 방법을 조정하는 경향이 보여요.",
          rhythm: "업무와 수업은 큰 방향을 두되 현장에서 방법을 조정하며 이어 갑니다.",
        },
        {
          intensityBandId: "strong",
          direction: "positive",
          headline: "미리 정한 흐름을 따르는 경향이 뚜렷한 편",
          summary: "순서와 준비를 미리 정한 뒤 일을 이어 가는 경향이 매우 뚜렷해요.",
          rhythm: "업무와 수업은 순서와 준비를 미리 정한 뒤 움직이는 흐름이 강하게 나타납니다.",
        },
        {
          intensityBandId: "strong",
          direction: "negative",
          headline: "현장에서 방법을 조정하는 경향이 뚜렷한 편",
          summary: "큰 방향을 두고 현장에서 방법을 조정하는 경향이 매우 뚜렷해요.",
          rhythm: "업무와 수업은 큰 방향을 두고 현장에서 방법을 조정하는 흐름이 강하게 나타납니다.",
        },
      ],
    },
  ],
} as const;
