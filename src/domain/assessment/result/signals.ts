import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import {
  centerResponse,
  maxAbsDeviation,
  resolveIntensity,
} from "@/domain/assessment/scoring/scoring";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import type { AxisId, QuestionId } from "@/domain/shared/ids";

/**
 * 응답 신호 (docs/PRD-result-v2.md 4장)
 *
 * 축 점수는 열두 문항을 **더해서 숫자 하나로** 만듭니다. 그 순간 문항 사이의 관계가 사라집니다.
 * 이 파일은 합산이 버리는 정보를 되살립니다.
 *
 *   S3 일관성    — 축 안에서 자기 자신과 일관됐는가
 *   S4 장면 분화 — 장면에 따라 답이 달라지는가
 *   S5 응답 폭   — 척도를 넓게 썼는가, 가운데에 머물렀는가
 *
 * 이 파일의 모든 함수는 **동기 순수 함수**입니다 (AGENTS.md 2.2).
 *   - async / await / I/O 없음
 *   - Date.now() / Math.random() 없음
 *   - 같은 입력 → 항상 같은 출력
 *
 * 경계값은 **척도 대비 비율**로 둡니다. 5점 척도든 7점 척도든 뜻이 유지되어야
 * 검사별 숫자를 엔진에 박지 않게 됩니다 (AGENTS.md 1.3).
 */

// ── 경계값 (검사별 숫자가 아니라 방법의 매개변수입니다) ──────────────────────

/** 축 내 흩어짐 구간 — 이론적 최대 분산 대비 비율. 5점 척도(최대 4)에서 0.8 / 1.8 */
const STEADY_VARIANCE_RATIO = 0.2;
const MIXED_VARIANCE_RATIO = 0.45;

/** 장면 사이 격차 — 최대 편차 대비 비율. 5점 척도(편차 2)에서 1.5 */
const CONTEXT_GAP_RATIO = 0.75;

/**
 * 장면 하나가 비교 대상이 되기 위한 조건입니다.
 *
 * 문항이 두 개뿐인 장면으로 "장면에 따라 다르다"고 말하면 잡음을 해석하는 것입니다.
 * polarity가 한쪽으로 몰린 장면도 제외합니다 — 무엇에든 동의하는 습관이
 * 장면 차이로 둔갑하기 때문입니다 (docs/content/teacher-style-v1-audit.md 6장).
 */
const CONTEXT_MIN_QUESTIONS = 3;
const CONTEXT_MAX_POLARITY_RATIO = 2;

/** 응답 폭 — 전체 문항 대비 비율 */
const WIDE_EXTREME_RATE = 0.35;
const CENTERED_MIDDLE_RATE = 0.4;

// ── 타입 ────────────────────────────────────────────────────────────────────

export type ConsistencyBandId = "steady" | "mixed" | "split";
export type ResponseStyleId = "wide" | "moderate" | "centered";

/** S3 — 한 축의 열두 문항이 서로 얼마나 모여 있는가 */
export interface AxisConsistency {
  readonly axisId: AxisId;
  readonly variance: number;
  readonly bandId: ConsistencyBandId;
  readonly questionCount: number;
}

/** 장면 하나의 요약. 화면에서 근거로 그대로 보여 줍니다. */
export interface ContextSample {
  readonly context: string;
  /** 축 방향으로 정렬한 평균. 양수면 positive 쪽입니다. */
  readonly mean: number;
  readonly questionCount: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
}

/** S4 — 같은 축인데 장면에 따라 답이 갈리는 경우 */
export interface AxisContextSplit {
  readonly axisId: AxisId;
  readonly gap: number;
  readonly high: ContextSample;
  readonly low: ContextSample;
}

/** S5 — 척도를 쓰는 습관 */
export interface ResponseStyle {
  readonly id: ResponseStyleId;
  readonly extremeRate: number;
  readonly middleRate: number;
  readonly answeredCount: number;
}

/**
 * T2 확신도 — 이 축의 해석을 얼마나 단단하게 말해도 되는가
 *
 * 보통 검사는 모든 문장을 같은 확신으로 말합니다. 그러면 근거가 얇은 부분도
 * 단단해 보여서, 안 맞는 결과를 받은 사람이 검사 전체를 의심하게 됩니다.
 */
export type ConfidenceId = "low" | "medium" | "high";

export interface AxisConfidence {
  readonly axisId: AxisId;
  readonly id: ConfidenceId;
  /** 확신도를 낮춘 까닭. 화면에 그대로 이유로 보여 줍니다. */
  readonly reasons: readonly ConfidenceReason[];
}

/** 확신도를 낮추는 사유. 문구는 콘텐츠가 소유하고 엔진은 사유만 가려냅니다. */
export type ConfidenceReason = "balanced" | "split" | "centered";

export interface AssessmentSignals {
  readonly consistency: readonly AxisConsistency[];
  /** 조건을 채운 축만 담깁니다. 비어 있으면 아무 말도 하지 않습니다. */
  readonly contextSplits: readonly AxisContextSplit[];
  readonly responseStyle: ResponseStyle;
  readonly confidence: readonly AxisConfidence[];
}

// ── 계산 ────────────────────────────────────────────────────────────────────

/** 응답값을 축 방향으로 정렬합니다. 양수면 positive 쪽으로 답한 것입니다. */
function alignedValue(value: number, centerValue: number, polarity: number): number {
  return centerResponse(value, centerValue) * polarity;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const average = mean(values);
  return mean(values.map((value) => (value - average) ** 2));
}

function consistencyBand(value: number, maxVariance: number): ConsistencyBandId {
  if (value <= STEADY_VARIANCE_RATIO * maxVariance) return "steady";
  if (value <= MIXED_VARIANCE_RATIO * maxVariance) return "mixed";
  return "split";
}

/**
 * 장면이 비교 대상이 될 수 있는지 봅니다.
 *
 * polarity가 한쪽만 있으면(`low === 0`) 묵종 편향을 상쇄할 방법이 없으므로 제외합니다.
 */
function isComparable(sample: ContextSample): boolean {
  if (sample.questionCount < CONTEXT_MIN_QUESTIONS) return false;
  const high = Math.max(sample.positiveCount, sample.negativeCount);
  const low = Math.min(sample.positiveCount, sample.negativeCount);
  if (low === 0) return false;
  return high / low <= CONTEXT_MAX_POLARITY_RATIO;
}

/**
 * 응답에서 신호 세 가지를 뽑습니다.
 *
 * 응답이 빠진 문항은 **그냥 건너뜁니다.** 미응답 검사는 `scoreAssessment`가 먼저 막으므로
 * 여기서는 오류를 만들지 않고, 있는 자료로 말할 수 있는 만큼만 말합니다.
 */
export function computeSignals(
  definition: AssessmentDefinition,
  responses: readonly AssessmentResponse[],
): AssessmentSignals {
  const { scale } = definition;
  const answerByQuestion = new Map<QuestionId, number>(
    responses.map((response) => [response.questionId, response.value]),
  );

  const deviation = maxAbsDeviation(scale);
  // 절반이 +편차, 절반이 -편차일 때가 가장 흩어진 상태입니다.
  const maxVariance = deviation ** 2;
  const gapThreshold = CONTEXT_GAP_RATIO * deviation;

  const consistency: AxisConsistency[] = [];
  const contextSplits: AxisContextSplit[] = [];
  /** 균형 구간인지 판단하려면 축 점수가 필요합니다. aligned 합이 곧 rawScore입니다. */
  const isBalancedAxis = new Map<AxisId, boolean>();

  for (const axis of definition.axes) {
    const mine = definition.questions.filter((question) => question.axisId === axis.id);

    const aligned: number[] = [];
    const byContext = new Map<string, { values: number[]; positive: number; negative: number }>();

    for (const question of mine) {
      const value = answerByQuestion.get(question.id);
      if (value === undefined) continue;

      const point = alignedValue(value, scale.centerValue, question.polarity);
      aligned.push(point);

      const bucket = byContext.get(question.context) ?? { values: [], positive: 0, negative: 0 };
      bucket.values.push(point);
      if (question.polarity === 1) bucket.positive += 1;
      else bucket.negative += 1;
      byContext.set(question.context, bucket);
    }

    if (aligned.length === 0) continue;

    const rawScore = aligned.reduce((sum, point) => sum + point, 0);
    const band = resolveIntensity(Math.abs(rawScore), axis.intensityBands);
    isBalancedAxis.set(axis.id, !band.directional);

    const axisVariance = variance(aligned);
    consistency.push({
      axisId: axis.id,
      variance: axisVariance,
      bandId: consistencyBand(axisVariance, maxVariance),
      questionCount: aligned.length,
    });

    const comparable = [...byContext.entries()]
      .map(([context, bucket]): ContextSample => ({
        context,
        mean: mean(bucket.values),
        questionCount: bucket.values.length,
        positiveCount: bucket.positive,
        negativeCount: bucket.negative,
      }))
      .filter(isComparable);

    // 비교할 장면이 둘 미만이면 "장면에 따라 다르다"고 말할 근거가 없습니다.
    if (comparable.length < 2) continue;

    const sorted = [...comparable].sort((a, b) => b.mean - a.mean);
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    if (high === undefined || low === undefined) continue;

    const gap = high.mean - low.mean;
    if (gap < gapThreshold) continue;

    contextSplits.push({ axisId: axis.id, gap, high, low });
  }

  const responseStyle = computeResponseStyle(definition, answerByQuestion);

  return {
    consistency,
    contextSplits,
    responseStyle,
    confidence: resolveConfidence(definition, consistency, responseStyle, isBalancedAxis),
  };
}

/**
 * 축마다 해석을 얼마나 단단하게 말해도 되는지 정합니다.
 *
 * 확신도를 낮추는 사유는 셋입니다.
 *   - 균형 구간이라 방향 자체를 단정하지 않는 경우
 *   - 축 안에서 답이 갈린 경우 (S3 split)
 *   - 척도 가운데에 머물러 점수가 눌린 경우 (S5 centered)
 *
 * 사유를 함께 돌려주므로 화면이 "왜 조심스럽게 말하는지"를 밝힐 수 있습니다.
 */
function resolveConfidence(
  definition: AssessmentDefinition,
  consistency: readonly AxisConsistency[],
  responseStyle: ResponseStyle,
  isBalancedAxis: ReadonlyMap<AxisId, boolean>,
): readonly AxisConfidence[] {
  const consistencyByAxis = new Map(consistency.map((item) => [item.axisId, item]));

  return definition.axes.map((axis): AxisConfidence => {
    const reasons: ConfidenceReason[] = [];

    if (isBalancedAxis.get(axis.id) === true) reasons.push("balanced");
    if (consistencyByAxis.get(axis.id)?.bandId === "split") reasons.push("split");
    if (responseStyle.id === "centered") reasons.push("centered");

    // 사유가 둘 이상 겹치면 그만큼 더 조심해서 말합니다.
    const id: ConfidenceId = reasons.length >= 2 ? "low" : reasons.length === 1 ? "medium" : "high";
    return { axisId: axis.id, id, reasons };
  });
}

/**
 * 척도를 쓰는 습관을 봅니다.
 *
 * 네 축이 전부 균형으로 나왔을 때, 그 이유가 성향이 아니라
 * **가운데를 많이 골랐기 때문**일 수 있습니다. 그 사실을 알려 주기 위한 신호입니다.
 */
function computeResponseStyle(
  definition: AssessmentDefinition,
  answerByQuestion: ReadonlyMap<QuestionId, number>,
): ResponseStyle {
  const values = definition.questions
    .map((question) => answerByQuestion.get(question.id))
    .filter((value): value is number => value !== undefined);

  const answeredCount = values.length;
  if (answeredCount === 0) {
    return { id: "moderate", extremeRate: 0, middleRate: 0, answeredCount: 0 };
  }

  // 양 끝 값은 척도에서 찾습니다 — 5점이면 1과 5, 7점이면 1과 7입니다.
  const optionValues = definition.scale.options.map((option) => option.value);
  const lowest = Math.min(...optionValues);
  const highest = Math.max(...optionValues);

  const extremeCount = values.filter((value) => value === lowest || value === highest).length;
  const middleCount = values.filter((value) => value === definition.scale.centerValue).length;

  const extremeRate = extremeCount / answeredCount;
  const middleRate = middleCount / answeredCount;

  const id: ResponseStyleId =
    middleRate >= CENTERED_MIDDLE_RATE
      ? "centered"
      : extremeRate >= WIDE_EXTREME_RATE
        ? "wide"
        : "moderate";

  return { id, extremeRate, middleRate, answeredCount };
}
