import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { err, ok, type Result } from "@/domain/shared/result";

import { type AssessmentDeps } from "@/application/assessment/dependencies";

export interface GetResultInput {
  readonly slug: string;
}

export interface GetResultOutput {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
}

/**
 * 저장된 결과를 불러옵니다.
 *
 * 연속 점수(rawScore)는 스냅샷에 그대로 들어 있고, 결과 텍스트는 현재 콘텐츠에서 찾습니다.
 * 그래서 문구만 수정된 새 버전(contentVersion)에서도 최신 문구로 보입니다.
 */
export async function getResult(
  deps: AssessmentDeps,
  input: GetResultInput,
): Promise<Result<GetResultOutput, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);
  const definition = found.value;

  const loaded = await deps.repository.loadResultSnapshot(definition.id);
  if (!loaded.ok) return err(loaded.error);
  if (loaded.value === null) {
    return err(assessmentError("SESSION_NOT_FOUND", `결과가 저장되어 있지 않습니다: ${input.slug}`));
  }
  const snapshot = loaded.value;

  if (
    snapshot.versions.assessmentVersion !== definition.assessmentVersion ||
    snapshot.versions.scoringVersion !== definition.scoring.scoringVersion
  ) {
    return err(
      assessmentError(
        "VERSION_MISMATCH",
        `저장된 결과의 버전이 현재 검사와 다릅니다: ${snapshot.versions.assessmentVersion}/${snapshot.versions.scoringVersion}`,
      ),
    );
  }

  const profile = definition.resultProfiles.find(
    (current) => current.key === snapshot.score.resultKey,
  );
  if (profile === undefined) {
    return err(
      assessmentError("RESULT_PROFILE_NOT_FOUND", `resultKey: ${String(snapshot.score.resultKey)}`),
    );
  }

  return ok({ definition, snapshot, profile });
}
