import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type {
  AssessmentDefinition,
  AssessmentQuestion,
} from "@/domain/assessment/model/definition";
import { findUnansweredQuestions } from "@/domain/assessment/session/completeness";
import type {
  AssessmentResponse,
  AssessmentSession,
} from "@/domain/assessment/session/session";
import { err, ok, type Result } from "@/domain/shared/result";

import { ensureCompatible, type AssessmentDeps } from "@/application/assessment/dependencies";

export interface ResumeSessionInput {
  readonly slug: string;
}

export interface ResumeSessionOutput {
  readonly definition: AssessmentDefinition;
  readonly session: AssessmentSession;
  readonly responses: readonly AssessmentResponse[];
  /** 아직 답하지 않은 문항 (order 순서) */
  readonly unanswered: readonly AssessmentQuestion[];
  /** 이어서 진행할 Part 번호. 전부 답했으면 마지막 Part */
  readonly nextSectionOrder: number;
}

/**
 * 저장된 세션을 복구합니다. ("이어서 하기" — PRD F-1.5)
 *
 * 버전이 달라졌으면 VERSION_MISMATCH를 돌려주고, 화면은 "새로 시작" 경로를 안내합니다.
 */
export async function resumeSession(
  deps: AssessmentDeps,
  input: ResumeSessionInput,
): Promise<Result<ResumeSessionOutput, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);
  const definition = found.value;

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

  const unanswered = findUnansweredQuestions(definition, responses.value);

  const lastSectionOrder = definition.sections.reduce(
    (max, section) => (section.order > max ? section.order : max),
    1,
  );

  const firstUnanswered = unanswered[0];
  const nextSection =
    firstUnanswered === undefined
      ? undefined
      : definition.sections.find((section) => section.id === firstUnanswered.sectionId);

  return ok({
    definition,
    session,
    responses: responses.value,
    unanswered,
    nextSectionOrder: nextSection === undefined ? lastSectionOrder : nextSection.order,
  });
}
