import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import { err, ok, type Result } from "@/domain/shared/result";

import { type AssessmentDeps } from "@/application/assessment/dependencies";

export interface ResetAssessmentInput {
  readonly slug: string;
}

/**
 * 다시 검사하기 — 해당 검사의 세션·응답·결과를 모두 지웁니다. (DEC-010)
 *
 * 이전 결과는 남기지 않습니다. 화면은 지우기 전에 덮어쓰기임을 안내합니다 (PRD F-5.6).
 */
export async function resetAssessment(
  deps: AssessmentDeps,
  input: ResetAssessmentInput,
): Promise<Result<void, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);

  const cleared = await deps.repository.clearAssessment(found.value.id);
  if (!cleared.ok) return err(cleared.error);

  return ok(undefined);
}

/**
 * 저장 데이터 전체 삭제 (DEC-015)
 *
 * 사용자가 Footer의 삭제 버튼을 눌렀을 때만 실행합니다.
 * 자동으로 지우지 않습니다 — 사용자를 당황시키기 때문입니다.
 */
export async function clearAllData(
  deps: Pick<AssessmentDeps, "repository">,
): Promise<Result<void, AssessmentError>> {
  const cleared = await deps.repository.clearAll();
  if (!cleared.ok) return err(cleared.error);
  return ok(undefined);
}
