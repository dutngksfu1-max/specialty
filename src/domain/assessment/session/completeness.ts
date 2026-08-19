import type {
  AssessmentDefinition,
  AssessmentQuestion,
} from "@/domain/assessment/model/definition";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import type { QuestionId } from "@/domain/shared/ids";

/**
 * 아직 응답하지 않은 문항을 order 순서로 돌려줍니다. (PRD F-3.7)
 * 화면은 이 목록의 첫 번째 문항으로 스크롤·포커스를 옮깁니다.
 */
export function findUnansweredQuestions(
  definition: AssessmentDefinition,
  responses: readonly AssessmentResponse[],
): readonly AssessmentQuestion[] {
  const answered = new Set<QuestionId>(responses.map((response) => response.questionId));
  return definition.questions
    .filter((question) => !answered.has(question.id))
    .slice()
    .sort((a, b) => a.order - b.order);
}
