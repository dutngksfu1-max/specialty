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
  ResponseScale,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AssessmentScore, AxisScore } from "@/domain/assessment/scoring/score";
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
 * 문항 수(40)·Part 수(4)·척도(5)·점수 범위(20)는 이 파일 어디에도 없습니다.
 * 전부 AssessmentDefinition 데이터에서 계산합니다.
 */

/** 응답값을 중앙값 기준으로 옮깁니다. 5점 척도(centerValue 3)면 1→-2 … 5→+2 */
export function centerResponse(value: number, centerValue: number): number {
  return value - centerValue;
}

/**
 * 척도가 만들어 낼 수 있는 최대 편차입니다.
 * 5점 척도(1~5, 중앙 3)면 2, 7점 척도(1~7, 중앙 4)면 3이 됩니다.
 */
function maxAbsDeviation(scale: ResponseScale): number {
  return scale.options.reduce((max, option) => {
    const deviation = Math.abs(centerResponse(option.value, scale.centerValue));
    return deviation > max ? deviation : max;
  }, 0);
}

/**
 * 절대 점수가 어느 강도 구간에 속하는지 찾습니다. (DEC-002b)
 * 경계값은 콘텐츠의 intensityBands에서 오며, 코드에는 0/4/5/12/13/20이 없습니다.
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
): AxisScore {
  const deviation = maxAbsDeviation(scale);

  let rawScore = 0;
  // extent = 이 축에서 나올 수 있는 최대 절대 점수 (문항 수 × 최대 편차 × weight)
  let extent = 0;

  for (const question of questions) {
    if (question.axisId !== axis.id) continue;

    extent += deviation * question.weight;

    const value = responses.get(question.id);
    if (value === undefined) continue;

    rawScore += centerResponse(value, scale.centerValue) * question.polarity * question.weight;
  }

  const minScore = -extent;
  const maxScore = extent;
  const span = maxScore - minScore;
  const normalized = span === 0 ? 0.5 : (rawScore - minScore) / span;

  const direction = rawScore > 0 ? "positive" : rawScore < 0 ? "negative" : axis.defaultPole;

  return {
    axisId: axis.id,
    rawScore,
    minScore,
    maxScore,
    normalized,
    direction,
    isBalanced: rawScore === 0,
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
    scoreAxis(axis, definition.questions, responseByQuestion, definition.scale),
  );

  const resultKey = resolveResultKey(axisScores, definition.resultProfiles);
  if (!resultKey.ok) {
    return err(resultKey.error);
  }

  return ok({ axisScores, resultKey: resultKey.value });
}
