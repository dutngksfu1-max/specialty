import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import type { QuestionId } from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";

import { ensureCompatible, type AssessmentDeps } from "@/application/assessment/dependencies";

export interface SaveResponseInput {
  readonly slug: string;
  readonly questionId: QuestionId;
  readonly value: number;
}

/**
 * 응답 1개를 저장합니다.
 *
 * 라디오를 누르는 즉시 호출됩니다. 디바운스하지 않습니다 —
 * 이탈 시 응답이 사라지지 않는 것이 이 제품의 핵심 요구사항입니다. (PRD F-3.5)
 */
export async function saveResponse(
  deps: AssessmentDeps,
  input: SaveResponseInput,
): Promise<Result<AssessmentResponse, AssessmentError>> {
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

  const question = definition.questions.find((current) => current.id === input.questionId);
  if (question === undefined) {
    return err(
      assessmentError("INVALID_RESPONSE", `이 검사에 없는 문항입니다: ${String(input.questionId)}`),
    );
  }

  const allowed = definition.scale.options.some((option) => option.value === input.value);
  if (!allowed) {
    return err(assessmentError("INVALID_RESPONSE", `척도에 없는 값입니다: ${input.value}`));
  }

  const answeredAt = deps.clock.now();
  const response: AssessmentResponse = {
    sessionId: session.id,
    questionId: question.id,
    value: input.value,
    answeredAt,
  };

  const saved = await deps.repository.saveResponse(response);
  if (!saved.ok) return err(saved.error);

  const touched = await deps.repository.saveSession({ ...session, updatedAt: answeredAt });
  if (!touched.ok) return err(touched.error);

  return ok(response);
}
