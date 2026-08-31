import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type {
  AssessmentAxis,
  AssessmentDefinition,
  AssessmentQuestion,
  IntensityBand,
  IntensityBands,
  PoleSide,
  ResponseScale,
  TieBreakRuleId,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type {
  AssessmentScore,
  AxisDirectionSource,
  AxisScore,
} from "@/domain/assessment/scoring/score";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import type { AxisId, QuestionId, ResultKey } from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";

/**
 * 채점 엔진 (docs/architecture.md 5장)
 *
 * 이 파일의 모든 함수는 **동기 순수 함수**입니다.
 *   - async / await / I/O 없음
 *   - Date.now() / Math.random() 없음
 *   - 입력을 변경하지 않음
 *   - 같은 입력 → 항상 같은 출력
 *
 * 문항 수·Part 수·척도·점수 범위의 검사별 값은 이 파일 어디에도 없습니다.
 * 전부 AssessmentDefinition 데이터에서 계산합니다.
 */

/** 응답값을 중앙값 기준으로 옮깁니다. 5점 척도(centerValue 3)면 1→-2 … 5→+2 */
export function centerResponse(value: number, centerValue: number): number {
  return value - centerValue;
}

/**
 * 척도가 만들어 낼 수 있는 최대 편차입니다.
 * 5점 척도(1~5, 중앙 3)면 2, 7점 척도(1~7, 중앙 4)면 3이 됩니다.
 *
 * 신호 계산(`result/signals.ts`)의 경계값도 이 값을 기준으로 잡습니다.
 * 그래야 척도가 바뀌어도 경계의 뜻이 유지됩니다.
 */
export function maxAbsDeviation(scale: ResponseScale): number {
  return scale.options.reduce((max, option) => {
    const deviation = Math.abs(centerResponse(option.value, scale.centerValue));
    return deviation > max ? deviation : max;
  }, 0);
}

/**
 * 절대 점수가 어느 게이지 구간에 속하는지 찾습니다. (DEC-068)
 * 경계값은 콘텐츠의 intensityBands에서 오며, 엔진에 검사별 숫자를 두지 않습니다.
 */
export function resolveIntensity(absScore: number, bands: IntensityBands): IntensityBand {
  for (const band of bands) {
    if (absScore >= band.minAbsScore && absScore <= band.maxAbsScore) {
      return band;
    }
  }

  // 콘텐츠 검증이 "구간이 0부터 최대 절대값까지 빈틈 없이 덮는다"를 보장하므로
  // 여기에는 도달하지 않습니다. 예외를 던지지 않기 위한 방어적 반환입니다.
  let widest = bands[0];
  for (const band of bands) {
    if (band.maxAbsScore > widest.maxAbsScore) {
      widest = band;
    }
  }
  return widest;
}

/**
 * 이 값 미만으로 척도를 썼으면 응답이 갈리지 않은 것으로 봅니다 (DEC-053).
 *
 * 2 = "가장 높게 준 값과 가장 낮게 준 값의 차이가 2점 이상". 전부 같은 값을 찍었거나
 * 3과 4만 오간 사람은 어디에도 반대하지 않은 것이라 방향을 읽을 근거가 없습니다.
 *
 * 동점 보정의 적용 여부가 모든 규칙에서 어긋나지 않도록 상수를 한 곳에 둡니다.
 */
const MIN_RESPONSE_RANGE_FOR_TIEBREAK = 2;

/**
 * 장면 보정에서 세는 장면의 최소 문항 수 (DEC-063)
 *
 * 문항이 하나뿐인 장면에 문항 여덟 개짜리 장면과 같은 무게를 주면
 * **문항 한 개가 축 방향을 정하게 됩니다.** 그건 보정이 아니라 우연입니다.
 */
const MIN_TIEBREAK_CONTEXT_QUESTIONS = 2;

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function leastCommonMultiple(a: number, b: number): number {
  return (a / greatestCommonDivisor(a, b)) * b;
}

interface AxisResponse {
  readonly question: AssessmentQuestion;
  /** 극 방향으로 정렬한 편차. 양수면 positive 쪽 */
  readonly aligned: number;
  /** 원래 응답값. 응답이 갈렸는지 볼 때는 정렬 전 값을 봐야 합니다 */
  readonly value: number;
}

/**
 * 장면마다 문항 수가 달라 생기는 쏠림을 걷어내고 다시 더합니다. (`context-mean`)
 *
 * 축 점수는 문항이 많은 장면이 더 세게 끌어당깁니다. 예를 들어 장면 A가 8문항,
 * 장면 B가 3문항이면 A가 축을 거의 혼자 정합니다. 동점일 때만, 장면을 **동등하게**
 * 놓고 다시 봅니다. "문항 수 쏠림을 걷어내면 이쪽"이라는 뜻입니다.
 *
 * 분수 합을 부동소수점으로 만들면 `=== 0` 비교가 흔들립니다. 최소공배수를 곱해
 * **정수로만** 계산합니다.
 */
function contextMeanTieBreak(answers: readonly AxisResponse[]): number {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const answer of answers) {
    const bucket = sums.get(answer.question.context) ?? { sum: 0, count: 0 };
    bucket.sum += answer.aligned;
    bucket.count += 1;
    sums.set(answer.question.context, bucket);
  }

  const eligible = [...sums.values()].filter(
    (bucket) => bucket.count >= MIN_TIEBREAK_CONTEXT_QUESTIONS,
  );
  if (eligible.length < 2) return 0;

  const common = eligible.reduce((acc, bucket) => leastCommonMultiple(acc, bucket.count), 1);
  return eligible.reduce((total, bucket) => total + bucket.sum * (common / bucket.count), 0);
}

/**
 * 척도 양 끝으로 강하게 답한 문항만 모아 더합니다. (`extreme-responses`)
 *
 * "확실히 그렇다 / 확실히 아니다"라고 말한 것들만 봅니다. 미지근한 응답이 서로 상쇄되어
 * 0이 된 경우에도, 분명히 답한 쪽이 남아 있으면 그쪽을 방향으로 봅니다.
 */
function extremeResponseTieBreak(answers: readonly AxisResponse[], scale: ResponseScale): number {
  const extreme = maxAbsDeviation(scale);
  if (extreme === 0) return 0;

  return answers.reduce(
    (total, answer) =>
      Math.abs(centerResponse(answer.value, scale.centerValue)) === extreme
        ? total + answer.aligned
        : total,
    0,
  );
}

function applyTieBreakRule(
  ruleId: TieBreakRuleId,
  answers: readonly AxisResponse[],
  scale: ResponseScale,
): number {
  switch (ruleId) {
    case "context-mean":
      return contextMeanTieBreak(answers);
    case "extreme-responses":
      return extremeResponseTieBreak(answers, scale);
  }
}

interface ResolvedDirection {
  readonly direction: PoleSide;
  readonly source: AxisDirectionSource;
  readonly ruleId?: TieBreakRuleId;
}

/**
 * 축의 방향을 정합니다 (DEC-001 · DEC-063).
 *
 * 1. 축 점수가 0이 아니면 그대로 씁니다
 * 2. 0이면 콘텐츠가 선언한 보정 규칙을 **순서대로** 적용합니다
 * 3. 그래도 갈리지 않으면 콘텐츠의 `defaultPole`을 사용합니다
 *
 * **응답이 갈리지 않은 축에는 보정을 걸지 않습니다.** 전부 같은 값을 찍으면 축 점수가
 * 반드시 0이 되는데, 장면마다 정·역 문항 수가 다르면 장면 보정이 거기서도 방향을
 * 만들어 냅니다. 답을 고르지 않은 사람에게 성향을 붙이는 셈이라 막습니다 (DEC-053).
 */
function resolveDirection(
  axis: AssessmentAxis,
  rawScore: number,
  answers: readonly AxisResponse[],
  scale: ResponseScale,
  tieBreak: readonly TieBreakRuleId[],
): ResolvedDirection {
  if (rawScore > 0) return { direction: "positive", source: "score" };
  if (rawScore < 0) return { direction: "negative", source: "score" };

  const values = answers.map((answer) => answer.value);
  const differentiated =
    values.length > 0 &&
    Math.max(...values) - Math.min(...values) >= MIN_RESPONSE_RANGE_FOR_TIEBREAK;

  if (differentiated) {
    for (const ruleId of tieBreak) {
      const signal = applyTieBreakRule(ruleId, answers, scale);
      if (signal !== 0) {
        return { direction: signal > 0 ? "positive" : "negative", source: "tiebreak", ruleId };
      }
    }
  }

  return { direction: axis.defaultPole, source: "default" };
}

/**
 * 축 하나의 점수를 계산합니다.
 *
 * questions에는 전체 문항을 넘겨도 됩니다. 이 축에 속한 문항만 골라 씁니다.
 * 전제: 이 축의 모든 문항에 응답이 있어야 합니다 (scoreAssessment가 먼저 검사합니다).
 */
export function scoreAxis(
  axis: AssessmentAxis,
  questions: readonly AssessmentQuestion[],
  responses: ReadonlyMap<QuestionId, number>,
  scale: ResponseScale,
  tieBreak: readonly TieBreakRuleId[] = [],
): AxisScore {
  const deviation = maxAbsDeviation(scale);

  let rawScore = 0;
  // extent = 이 축에서 나올 수 있는 최대 절대 점수 (문항 수 × 최대 편차 × weight)
  let extent = 0;
  const answers: AxisResponse[] = [];

  for (const question of questions) {
    if (question.axisId !== axis.id) continue;

    extent += deviation * question.weight;

    const value = responses.get(question.id);
    if (value === undefined) continue;

    const aligned = centerResponse(value, scale.centerValue) * question.polarity * question.weight;
    rawScore += aligned;
    answers.push({ question, aligned, value });
  }

  const minScore = -extent;
  const maxScore = extent;
  const span = maxScore - minScore;
  const normalized = span === 0 ? 0.5 : (rawScore - minScore) / span;

  const resolved = resolveDirection(axis, rawScore, answers, scale, tieBreak);

  return {
    axisId: axis.id,
    rawScore,
    minScore,
    maxScore,
    normalized,
    direction: resolved.direction,
    directionSource: resolved.source,
    ...(resolved.ruleId === undefined ? {} : { tieBreakRuleId: resolved.ruleId }),
    intensityBandId: resolveIntensity(Math.abs(rawScore), axis.intensityBands).id,
  };
}

/** 축 방향 조합으로 결과 프로필 하나를 찾습니다. */
export function resolveResultKey(
  axisScores: readonly AxisScore[],
  profiles: readonly ResultProfile[],
): Result<ResultKey, AssessmentError> {
  const match = profiles.find((profile) =>
    axisScores.every((axisScore) => profile.poles[axisScore.axisId] === axisScore.direction),
  );

  if (match === undefined) {
    const combination = axisScores
      .map((axisScore) => `${axisScore.axisId}=${axisScore.direction}`)
      .join(", ");
    return err(
      assessmentError("RESULT_PROFILE_NOT_FOUND", `조합에 맞는 결과 프로필이 없습니다: ${combination}`),
    );
  }

  return ok(match.key);
}

/** 검사 전체를 채점합니다. 입력이 온전하지 않으면 오류를 값으로 반환합니다. */
export function scoreAssessment(
  definition: AssessmentDefinition,
  responses: readonly AssessmentResponse[],
): Result<AssessmentScore, AssessmentError> {
  if (definition.axes.length === 0) {
    return err(assessmentError("INVALID_CONTENT_PACKAGE", "축이 하나도 없습니다."));
  }

  const axisIds = new Set<AxisId>(definition.axes.map((axis) => axis.id));
  for (const question of definition.questions) {
    if (!axisIds.has(question.axisId)) {
      return err(
        assessmentError("INVALID_CONTENT_PACKAGE", `문항 ${question.id}의 axisId가 축 목록에 없습니다.`),
      );
    }
  }

  const allowedValues = new Set(definition.scale.options.map((option) => option.value));
  const knownQuestions = new Set<QuestionId>(definition.questions.map((question) => question.id));

  const responseByQuestion = new Map<QuestionId, number>();
  for (const response of responses) {
    if (!knownQuestions.has(response.questionId)) {
      return err(
        assessmentError("INVALID_RESPONSE", `이 검사에 없는 문항의 응답입니다: ${response.questionId}`),
      );
    }
    if (!allowedValues.has(response.value)) {
      return err(assessmentError("INVALID_RESPONSE", `척도에 없는 값입니다: ${response.value}`));
    }
    responseByQuestion.set(response.questionId, response.value);
  }

  const unanswered = definition.questions.filter(
    (question) => !responseByQuestion.has(question.id),
  );
  if (unanswered.length > 0) {
    const first = unanswered[0];
    return err(
      assessmentError(
        "INCOMPLETE_RESPONSES",
        `미응답 ${unanswered.length}문항 (첫 번째 order: ${first === undefined ? "?" : first.order})`,
      ),
    );
  }

  const axisScores = definition.axes.map((axis) =>
    scoreAxis(
      axis,
      definition.questions,
      responseByQuestion,
      definition.scale,
      definition.scoring.tieBreak ?? [],
    ),
  );

  const resultKey = resolveResultKey(axisScores, definition.resultProfiles);
  if (!resultKey.ok) {
    return err(resultKey.error);
  }

  return ok({ axisScores, resultKey: resultKey.value });
}
