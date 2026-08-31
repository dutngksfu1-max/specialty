import type {
  AssessmentAxis,
  AssessmentDefinition,
  AssessmentQuestion,
  AssessmentSection,
  IntensityBands,
  PoleSide,
  Polarity,
  ResponseScale,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import {
  toAssessmentId,
  toAxisId,
  toQuestionId,
  toResultKey,
  toSectionId,
  toSessionId,
  type AxisId,
} from "@/domain/shared/ids";

/**
 * 테스트 전용 검사 정의 생성기.
 *
 * 배포되는 콘텐츠가 아닙니다. 축 개수·문항 수·척도 점수를 자유롭게 바꿔
 * "엔진이 특정 검사에 묶여 있지 않다"는 것을 확인하는 데 씁니다.
 */

export interface AxisSpec {
  readonly id: string;
  /** 문항 하나당 polarity 하나. 배열 길이 = 이 축의 문항 수 */
  readonly polarities: readonly Polarity[];
  readonly defaultPole?: PoleSide;
  readonly bands?: IntensityBands;
  /**
   * 문항 하나당 장면 하나. `polarities`와 길이가 같아야 합니다.
   * 생략하면 두 장면을 번갈아 넣습니다.
   */
  readonly contexts?: readonly string[];
}

export interface DefinitionSpec {
  readonly axes: readonly AxisSpec[];
  /** 척도 점수. 5면 1~5, 중앙값 3 */
  readonly scalePoints?: number;
  readonly sectionCount?: number;
  /** false면 resultProfiles를 비웁니다 (RESULT_PROFILE_NOT_FOUND 확인용) */
  readonly includeProfiles?: boolean;
}

/** DEC-002b의 기본 구간. 5점 척도 × 10문항(=최대 20점) 기준입니다. */
export const standardBands: IntensityBands = [
  { id: "leaning", label: "근소한 차이", minAbsScore: 0, maxAbsScore: 4 },
  { id: "clear", label: "분명한 차이", minAbsScore: 5, maxAbsScore: 12 },
  { id: "strong", label: "큰 차이", minAbsScore: 13, maxAbsScore: 20 },
];

export function buildScale(points: number): ResponseScale {
  const options = Array.from({ length: points }, (_, index) => ({
    value: index + 1,
    label: `[fixture] 척도 ${index + 1}`,
  }));

  return {
    id: `fixture-scale-${points}`,
    options,
    centerValue: (points + 1) / 2,
  };
}

function buildAxis(spec: AxisSpec): AssessmentAxis {
  const id = toAxisId(spec.id);
  return {
    id,
    name: `[fixture] 축 ${spec.id}`,
    positive: {
      side: "positive",
      label: `[fixture] ${spec.id} 양극`,
      shortLabel: "[fixture]+",
      description: `[fixture] ${spec.id} 양극 설명`,
    },
    negative: {
      side: "negative",
      label: `[fixture] ${spec.id} 음극`,
      shortLabel: "[fixture]-",
      description: `[fixture] ${spec.id} 음극 설명`,
    },
    defaultPole: spec.defaultPole ?? "positive",
    intensityBands: spec.bands ?? standardBands,
  };
}

/** 축 개수 n에 대해 2^n개의 pole 조합을 만듭니다. */
export function allPoleCombinations(
  axisIds: readonly AxisId[],
): readonly Readonly<Record<AxisId, PoleSide>>[] {
  return axisIds.reduce<Readonly<Record<AxisId, PoleSide>>[]>(
    (combinations, axisId) =>
      combinations.flatMap((combination) => [
        { ...combination, [axisId]: "positive" as PoleSide },
        { ...combination, [axisId]: "negative" as PoleSide },
      ]),
    [{}],
  );
}

function buildProfiles(axes: readonly AssessmentAxis[]): readonly ResultProfile[] {
  const axisIds = axes.map((axis) => axis.id);

  return allPoleCombinations(axisIds).map((poles) => {
    const key = axisIds.map((axisId) => (poles[axisId] === "positive" ? "p" : "n")).join("");
    return {
      key: toResultKey(key),
      poles,
      title: `[fixture] 결과 ${key}`,
      oneLiner: `[fixture] 한 줄 설명 ${key}`,
      rhythm: `[fixture] 리듬 ${key}`,
      shiningMoments: [{ scene: "[fixture] 장면", situation: "[fixture] 상황", text: `[fixture] 빛나는 순간 ${key}` }],
      underPressure: [{ scene: "[fixture] 장면", situation: "[fixture] 상황", text: `[fixture] 바쁠 때 ${key}` }],
      withColleagues: [{ scene: "[fixture] 장면", situation: "[fixture] 상황", text: `[fixture] 동료와 ${key}` }],
      collaboration: {
        naturalFit: [`[fixture] 자연스러운 ${key}`],
        needsTuning: [`[fixture] 조율하면 ${key}`],
      },
      nextSteps: [`[fixture] 내일 해 볼 것 ${key}`],
      talkingPoints: [`[fixture] 나눌 질문 ${key}`],
    };
  });
}

export function buildDefinition(spec: DefinitionSpec): AssessmentDefinition {
  const scalePoints = spec.scalePoints ?? 5;
  const sectionCount = spec.sectionCount ?? 1;
  const axes = spec.axes.map(buildAxis);

  const sections: readonly AssessmentSection[] = Array.from(
    { length: sectionCount },
    (_, index) => ({
      id: toSectionId(`part-${index + 1}`),
      order: index + 1,
      title: `[fixture] Part ${index + 1}`,
    }),
  );

  const questions: AssessmentQuestion[] = [];
  let order = 0;
  for (const axisSpec of spec.axes) {
    axisSpec.polarities.forEach((polarity, index) => {
      const sectionIndex = order % sectionCount;
      const section = sections[sectionIndex];
      order += 1;
      questions.push({
        id: toQuestionId(`${axisSpec.id}-q${index + 1}`),
        sectionId: section === undefined ? toSectionId("part-1") : section.id,
        order,
        text: `[fixture] 축 ${axisSpec.id} 문항 ${index + 1}`,
        axisId: toAxisId(axisSpec.id),
        polarity,
        weight: 1,
        // fixture는 장면을 번갈아 넣어, 맥락이 하나로 몰린 경우와 갈린 경우를 모두 만들 수 있게 합니다.
        context:
          axisSpec.contexts?.[index] ??
          (index % 2 === 0 ? "fixture-scene-a" : "fixture-scene-b"),
      });
    });
  }

  return {
    id: toAssessmentId("fixture-assessment"),
    slug: "fixture-assessment",
    title: "[fixture] 검사",
    summary: "[fixture] 요약",
    description: "[fixture] 설명",
    estimatedMinutes: 10,
    status: "published",
    assessmentVersion: 1,
    contentVersion: "1.0.0",
    scale: buildScale(scalePoints),
    axes,
    axisCombinations: [],
    sections,
    questions,
    scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
    resultProfiles: spec.includeProfiles === false ? [] : buildProfiles(axes),
  };
}

export const fixtureSessionId = toSessionId("fixture-session");

/**
 * 축별 응답값 배열을 AssessmentResponse[]로 바꿉니다.
 * 예) respond(definition, { "axis-a": [5, 4, 5, 4, 4, 2, 1, 2, 2, 1] })
 */
export function respond(
  definition: AssessmentDefinition,
  valuesByAxis: Readonly<Record<string, readonly number[]>>,
): readonly AssessmentResponse[] {
  const cursor = new Map<string, number>();

  return definition.questions.map((question) => {
    const axisKey = String(question.axisId);
    const index = cursor.get(axisKey) ?? 0;
    cursor.set(axisKey, index + 1);

    const values = valuesByAxis[axisKey];
    const value = values === undefined ? definition.scale.centerValue : values[index];

    return {
      sessionId: fixtureSessionId,
      questionId: question.id,
      value: value ?? definition.scale.centerValue,
      answeredAt: "2026-08-19T00:00:00.000Z",
    };
  });
}
