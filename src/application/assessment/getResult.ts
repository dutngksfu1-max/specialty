import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import {
  computeSignals,
  type AssessmentSignals,
} from "@/domain/assessment/result/signals";
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
  /**
   * 응답에서 뽑은 신호 (docs/PRD-result-v2.md 4장).
   *
   * 스냅샷에 저장하지 않고 **읽을 때마다 원본 응답에서 다시 계산**합니다.
   * 계산 방법을 개선하면 예전 결과도 함께 좋아지고, 스냅샷 형식을 바꿀 일이 없습니다.
   * 응답이 지워졌으면 `undefined`입니다 — 신호 없이도 결과는 보여야 합니다.
   */
  readonly signals?: AssessmentSignals;
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

  // 응답은 검사를 마친 뒤에도 남아 있습니다 (재검사할 때만 지웁니다 — DEC-010).
  // 불러오지 못하더라도 결과 자체는 보여 줘야 하므로 오류로 만들지 않습니다.
  const responses = await deps.repository.loadResponses(snapshot.sessionId);
  const signals = responses.ok ? computeSignals(definition, responses.value) : undefined;

  return ok({ definition, snapshot, profile, signals });
}
