import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type {
  AssessmentDefinition,
  AssessmentQuestion,
  AssessmentSection,
} from "@/domain/assessment/model/definition";
import type { AssessmentSession } from "@/domain/assessment/session/session";
import type { QuestionId } from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";

import { ensureCompatible, type AssessmentDeps } from "@/application/assessment/dependencies";

export interface GetPartStateInput {
  readonly slug: string;
  /** Part 번호 (1부터) */
  readonly sectionOrder: number;
}

export interface GetPartStateOutput {
  readonly definition: AssessmentDefinition;
  readonly session: AssessmentSession;
  readonly section: AssessmentSection;
  readonly questions: readonly AssessmentQuestion[];
  /** 이 Part의 문항에 대한 현재 응답 (questionId → 값) */
  readonly answers: ReadonlyMap<QuestionId, number>;
  /** 이 Part에서 아직 답하지 않은 문항 (order 순서) */
  readonly unansweredInPart: readonly AssessmentQuestion[];
  /** 검사 전체 진행 상황 */
  readonly answeredCount: number;
  readonly totalCount: number;
  readonly isFirstSection: boolean;
  readonly isLastSection: boolean;
}

/**
 * Part 하나를 그리는 데 필요한 것을 한 번에 모아 줍니다. (PRD F-3.4)
 *
 * 문항 수·Part 수를 코드가 정하지 않습니다. 전부 definition에서 세어 옵니다.
 */
export async function getPartState(
  deps: AssessmentDeps,
  input: GetPartStateInput,
): Promise<Result<GetPartStateOutput, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);
  const definition = found.value;

  const section = definition.sections.find((current) => current.order === input.sectionOrder);
  if (section === undefined) {
    // 유효하지 않은 Part 번호입니다. 라우트는 이 오류를 받아 notFound()로 처리합니다 (DEC-005).
    return err(
      assessmentError("ASSESSMENT_NOT_FOUND", `Part ${input.sectionOrder}는 없는 Part입니다.`),
    );
  }

  const loaded = await deps.repository.loadSession(definition.id);
  if (!loaded.ok) return err(loaded.error);
  if (loaded.value === null) {
    return err(assessmentError("SESSION_NOT_FOUND", `slug: ${input.slug}`));
  }

  const compatible = ensureCompatible(loaded.value, definition);
  if (!compatible.ok) return err(compatible.error);
  const session = compatible.value;

  const responses = await deps.repository.loadResponses(session.id);
  if (!responses.ok) return err(responses.error);

  const answeredAll = new Map<QuestionId, number>();
  for (const response of responses.value) {
    answeredAll.set(response.questionId, response.value);
  }

  const questions = definition.questions
    .filter((question) => question.sectionId === section.id)
    .slice()
    .sort((a, b) => a.order - b.order);

  const answers = new Map<QuestionId, number>();
  for (const question of questions) {
    const value = answeredAll.get(question.id);
    if (value !== undefined) answers.set(question.id, value);
  }

  const orders = definition.sections.map((current) => current.order);
  const minOrder = Math.min(...orders);
  const maxOrder = Math.max(...orders);

  return ok({
    definition,
    session,
    section,
    questions,
    answers,
    unansweredInPart: questions.filter((question) => !answers.has(question.id)),
    answeredCount: definition.questions.filter((question) => answeredAll.has(question.id)).length,
    totalCount: definition.questions.length,
    isFirstSection: section.order === minOrder,
    isLastSection: section.order === maxOrder,
  });
}
