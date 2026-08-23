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
  /**
   * 유형 코드에서 이 극을 나타내는 글자 한 개 (DEC-049)
   *
   * 글자는 **콘텐츠가 소유합니다.** 엔진은 자리 순서대로 이어 붙이기만 합니다.
   * 화면 코드에 글자를 하드코딩하면 다음 검사에서 코드가 깨집니다 (AGENTS.md 7절).
   */
  readonly code?: string;
  /**
   * 다른 성향 검사로 환산할 때 이 극에 대응하는 글자 한 개 (DEC-049)
   *
   * 네 글자를 통째로 두지 않고 극마다 한 글자씩만 둡니다.
   * 조립은 `buildTypeCode`가 하며, 저장소 전체 금지 표현 검사가 계속 0건으로 유지됩니다.
   */
  readonly crosswalkCode?: string;
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
  /**
   * 균형 축이 하나라도 있을 때 쓰는 제목 (DEC-046 · DEC-062)
   *
   * 균형 축의 방향은 `axis.defaultPole`이 임의로 채웁니다. 그렇게 뽑힌 16개 프로필의
   * 제목을 그대로 쓰면, 사실상 동전 던지기로 정해진 이름을 "당신"이라고 부르게 됩니다.
   */
  readonly balancedTitle: string;
  readonly balancedOneLiner: string;
  /** 균형 축이 있을 때의 교직 리듬. 없으면 화면은 프로필 리듬으로 되돌아갑니다 */
  readonly balancedRhythm?: string;
  readonly balancedAxisNote: string;
  /**
   * 0점이지만 응답이 갈리지 않아 방향을 읽을 수 없는 축에 쓰는 문구 (DEC-053)
   *
   * 이 축은 **균형이 아닙니다.** 답을 고르지 않은 사람에게 "두 성향을 고루 쓰시네요"라고
   * 말하는 것은 해석이 아니라 지어내기입니다. 없으면 화면은 균형과 같게 다룹니다.
   */
  readonly unreadableAxisNote?: string;
  /** 위 축의 짧은 표식. 화면에서 '균형' 자리에 대신 들어갑니다 */
  readonly unreadableAxisLabel?: string;
  /** 본문 흐름을 끊지 않고 해석 범위만 짧게 알리는 문구 */
  readonly scopeNote: string;
  /**
   * 줄글에서 눈이 걸릴 곳을 만들 핵심 어구입니다.
   *
   * 무엇을 강조할지는 **콘텐츠가 정하고**, 한 문장에 몇 개까지 칠할지는 엔진이 막습니다.
   * 이 검사는 축마다 전용 어휘를 쓰므로 목록 하나를 모든 결과 문장에 함께 써도 축이 섞이지 않습니다.
   */
  readonly emphasisTerms: readonly string[];
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

/**
 * 유형 코드 표기 규격 (DEC-049)
 *
 * 체계 이름·균형 표시·환산 문구를 전부 콘텐츠가 소유합니다.
 * 엔진은 "자리마다 글자 하나"라는 규칙만 알고, 무슨 글자인지도 무슨 이름인지도 모릅니다.
 */
export interface TypeCodeSpec {
  /** 화면에 쓰는 체계 이름 (예: "4렌즈 코드") */
  readonly label: string;
  /** 균형 구간인 자리에 대신 넣는 글자 */
  readonly balancedLetter: string;
  /** 균형 자리가 있을 때 코드 옆에 붙이는 안내 */
  readonly balancedNote: string;
  /**
   * 다른 검사로의 환산 표기. 없으면 환산을 아예 보여 주지 않습니다.
   *
   * 접지 않고 늘 보이되, 유형 코드보다 작게 표시합니다 (DEC-057).
   */
  readonly crosswalk?: {
    /** 환산 코드 위에 붙는 검사 이름 */
    readonly systemLabel: string;
    /** 사용자가 알고 있는 실제 코드를 입력할 때 쓰는 라벨 */
    readonly selfReportedLabel: string;
    /** 랜딩 입력란의 라벨 */
    readonly selfReportedInputLabel: string;
    /** 환산이 정확한 변환이 아니라 근사임을 알리는 문구 */
    readonly disclaimer: string;
    /** 균형 자리가 있어 환산하지 않을 때 대신 보여 줄 문구 */
    readonly unavailableNote: string;
  };
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
  /** 화면에 보여 줄 소요 시간. 범위 안내처럼 숫자 하나로 표현할 수 없을 때 사용합니다. */
  readonly estimatedTimeLabel?: string;
  readonly status: "published" | "upcoming";
  readonly assessmentVersion: number;
  readonly contentVersion: string;
  readonly scale: ResponseScale;
  readonly axes: readonly AssessmentAxis[];
  /** 방향·강도·균형을 함께 반영하는 결과 서술. 없으면 기존 프로필 문구를 사용합니다. */
  readonly resultNarrative?: ResultNarrativeSpec;
  /** 유형 코드 표기 규격. 없으면 결과에 코드를 표시하지 않습니다 (DEC-049) */
  readonly typeCode?: TypeCodeSpec;
  /** 축 조합 해석. 없을 수도 있습니다 */
  readonly axisCombinations: readonly AxisCombination[];
  readonly sections: readonly AssessmentSection[];
  readonly questions: readonly AssessmentQuestion[];
  readonly scoring: ScoringSpec;
  readonly resultProfiles: readonly ResultProfile[];
}
