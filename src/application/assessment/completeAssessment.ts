import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { scoreAssessment } from "@/domain/assessment/scoring/scoring";
import { findUnansweredQuestions } from "@/domain/assessment/session/completeness";
import { err, ok, type Result } from "@/domain/shared/result";

import { ensureCompatible, type AssessmentDeps } from "@/application/assessment/dependencies";

export interface CompleteAssessmentInput {
  readonly slug: string;
}

export interface CompleteAssessmentOutput {
  readonly snapshot: ResultSnapshot;
}

/**
 * 전 문항 응답을 확인하고, 채점하고, 결과 스냅샷을 저장합니다.
 *
 * 채점 자체는 Domain의 동기 순수 함수입니다. 여기서는 불러오기·저장만 담당합니다.
 */
export async function completeAssessment(
  deps: AssessmentDeps,
  input: CompleteAssessmentInput,
): Promise<Result<CompleteAssessmentOutput, AssessmentError>> {
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

  // 미응답이 있으면 채점하지 않습니다 (DEC-014). 화면은 첫 미응답 문항으로 이동합니다.
  const unanswered = findUnansweredQuestions(definition, responses.value);
  if (unanswered.length > 0) {
    const first = unanswered[0];
    return err(
      assessmentError(
        "INCOMPLETE_RESPONSES",
        `미응답 ${unanswered.length}문항 (첫 번째 order: ${first === undefined ? "?" : first.order})`,
      ),
    );
  }

  const score = scoreAssessment(definition, responses.value);
  if (!score.ok) return err(score.error);

  const completedAt = deps.clock.now();

  const snapshot: ResultSnapshot = {
    assessmentId: definition.id,
    sessionId: session.id,
    nickname: session.nickname,
    score: score.value,
    versions: session.versions,
    completedAt,
  };

  const savedSnapshot = await deps.repository.saveResultSnapshot(snapshot);
  if (!savedSnapshot.ok) return err(savedSnapshot.error);

  const savedSession = await deps.repository.saveSession({
    ...session,
    completedAt,
    updatedAt: completedAt,
  });
  if (!savedSession.ok) return err(savedSession.error);

  return ok({ snapshot });
}
