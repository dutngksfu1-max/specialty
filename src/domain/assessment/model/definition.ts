import type { AssessmentId, AxisId, QuestionId, SectionId } from "@/domain/shared/ids";
import type { ResultProfile } from "@/domain/assessment/result/profile";

/**
 * 검사 정의 (docs/architecture.md 4.2)
 *
 * 문항 수·Part 수·척도 점수·축 개수·구간 경계값이 전부 이 데이터 안에 있습니다.
 * 엔진 코드에는 40 / 4 / 5 / 20 같은 숫자가 등장하지 않습니다.
 */
export type Polarity = 1 | -1;
export type PoleSide = "positive" | "negative";

export interface AxisPole {
  readonly side: PoleSide;
  readonly label: string;
  /** 좁은 화면용 짧은 이름 */
  readonly shortLabel: string;
  readonly description: string;
}

export interface IntensityBand {
  /** "balanced" | "clear" | "strong" 같은 내부 식별자 */
  readonly id: string;
  /** "균형" | "뚜렷" | "매우 뚜렷" — 문구는 콘텐츠가 소유합니다 */
  readonly label: string;
  /** 이 값 이상 */
  readonly minAbsScore: number;
  /** 이 값 이하 */
  readonly maxAbsScore: number;
  /** false면 이 구간에서는 어느 한쪽 방향으로 해석하지 않습니다. */
  readonly directional: boolean;
}

/**
 * 축에는 강도 구간이 최소 1개 있어야 합니다.
 * 비어 있을 수 없다는 사실을 타입으로 표현해 두면
 * resolveIntensity가 예외 없이 항상 하나를 반환할 수 있습니다.
 */
export type IntensityBands = readonly [IntensityBand, ...IntensityBand[]];

export interface AssessmentAxis {
  readonly id: AxisId;
  readonly name: string;
  readonly positive: AxisPole;
  readonly negative: AxisPole;
  /** 점수가 정확히 0일 때 사용할 방향 (DEC-001) */
  readonly defaultPole: PoleSide;
  readonly intensityBands: IntensityBands;
}

/**
 * 축 조합 해석 (contentVersion 3.0.0)
 *
 * 두 축이 만났을 때만 보이는 이야기입니다. 축을 늘리지 않고 해석만 늘리는 방법이라,
 * 축 사이 겹침을 만들지 않으면서 결과의 두께를 키울 수 있습니다.
 */
export interface AxisCombinationReading {
  /** 이 해석이 적용되는 축 → 방향 조합. `axisIds`의 축을 모두 포함해야 합니다. */
  readonly poles: Readonly<Record<AxisId, PoleSide>>;
  readonly text: string;
}

export interface AxisCombination {
  readonly id: string;
  /** 화면에 보이는 제목 (예: "새로운 것을 대하는 태도") */
  readonly title: string;
  /** 이 해석이 읽는 축들. 2개 이상 */
  readonly axisIds: readonly AxisId[];
  /** 축 방향의 모든 조합(2^축개수)을 빠짐없이 담습니다 */
  readonly readings: readonly AxisCombinationReading[];
}

export type NarrativeDirection = PoleSide | "balanced";

/**
 * 축 점수의 방향과 강도를 함께 읽는 결과 문장입니다.
 *
 * 비방향 구간도 rawScore가 0이 아니면 positive/negative 읽기를 사용해
 * 작은 기울기를 설명할 수 있습니다. 이때 방향 읽기는 프로필 확정이 아니라
 * 균형 범위 안의 차이를 보여 주기 위한 것입니다.
 */
export interface AxisNarrativeReading {
  readonly intensityBandId: string;
  readonly direction: NarrativeDirection;
  /** 결과 상단 제목으로 쓸 수 있는 짧은 문장 */
  readonly headline: string;
  /** 결과 상단 한 줄 설명에 쓰는 문장 */
  readonly summary: string;
  /** '나의 교직 리듬'에서 이 축을 설명하는 한 문장 */
  readonly rhythm: string;
}

export interface AxisResultNarrative {
  readonly axisId: AxisId;
  readonly readings: readonly AxisNarrativeReading[];
  /**
   * T3 반증 여지 — "이 설명이 안 맞는다면" 문구 (docs/PRD-result-v2.md 5장)
   *
   * 반박할 수 없는 결과는 검사가 아니라 점괘입니다.
   * 결과가 빗나갔을 때 무엇을 의심해 보면 되는지를 먼저 알려 줍니다.
   */
  readonly counterEvidence: string;
}

/** 검사별 결과 서술 규격. 채점 엔진은 이 문구를 알지 못합니다. */
export interface ResultNarrativeSpec {
  readonly balancedTitle: string;
  readonly balancedOneLiner: string;
  readonly balancedAxisNote: string;
  /** 본문 흐름을 끊지 않고 해석 범위만 짧게 알리는 문구 */
  readonly scopeNote: string;
  /** 균형 축이 하나라도 있을 때 부호 기반 16개 프로필 대신 보여 줄 중립 안내 */
  readonly balancedGuidance: Pick<
    ResultProfile,
    | "shiningMoments"
    | "underPressure"
    | "withColleagues"
    | "collaboration"
    | "nextSteps"
    | "talkingPoints"
  >;
  readonly axes: readonly AxisResultNarrative[];
}

export interface ResponseOption {
  readonly value: number;
  /** 접근성 라벨. 모든 선택지에 필요합니다 */
  readonly label: string;
  /** 화면에 보이는 라벨. 검사별 프레젠테이션 규칙에 따라 선택적으로 존재합니다 */
  readonly visibleLabel?: string;
}

export interface ResponseScale {
  readonly id: string;
  readonly options: readonly ResponseOption[];
  /** 5점 척도면 3 */
  readonly centerValue: number;
}

export interface AssessmentQuestion {
  readonly id: QuestionId;
  readonly sectionId: SectionId;
  /** 전체 통 번호. 1부터 연속 */
  readonly order: number;
  readonly text: string;
  readonly axisId: AxisId;
  readonly polarity: Polarity;
  /** MVP에서 항상 1 */
  readonly weight: number;
  /**
   * 이 문항이 묻는 교직 장면입니다. 채점에는 쓰이지 않습니다.
   *
   * 같은 축이라도 장면에 따라 답이 갈리는지 살피는 데 씁니다.
   * 장면 이름은 검사가 소유하므로 엔진은 문자열로만 다룹니다 (DEC-004와 같은 원칙).
   */
  readonly context: string;
}

export interface AssessmentSection {
  readonly id: SectionId;
  readonly order: number;
  readonly title: string;
  readonly description?: string;
}

export interface ScoringSpec {
  readonly strategyId: "centered-likert-axis-sum";
  readonly scoringVersion: number;
}

export interface AssessmentDefinition {
  readonly id: AssessmentId;
  /** URL에 쓰입니다. 4글자 유형 코드 금지 */
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly status: "published" | "upcoming";
  readonly assessmentVersion: number;
  readonly contentVersion: string;
  readonly scale: ResponseScale;
  readonly axes: readonly AssessmentAxis[];
  /** 방향·강도·균형을 함께 반영하는 결과 서술. 없으면 기존 프로필 문구를 사용합니다. */
  readonly resultNarrative?: ResultNarrativeSpec;
  /** 축 조합 해석. 없을 수도 있습니다 */
  readonly axisCombinations: readonly AxisCombination[];
  readonly sections: readonly AssessmentSection[];
  readonly questions: readonly AssessmentQuestion[];
  readonly scoring: ScoringSpec;
  readonly resultProfiles: readonly ResultProfile[];
}
