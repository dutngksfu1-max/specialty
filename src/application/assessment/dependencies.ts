import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { AssessmentCatalog } from "@/domain/assessment/ports/assessmentCatalog";
import type { AssessmentRepository } from "@/domain/assessment/ports/assessmentRepository";
import type { Clock } from "@/domain/assessment/ports/clock";
import type { IdGenerator } from "@/domain/assessment/ports/idGenerator";
import type {
  AssessmentSession,
  AssessmentVersions,
} from "@/domain/assessment/session/session";
import { err, ok, type Result } from "@/domain/shared/result";

/**
 * 유스케이스가 바깥 세계와 만나는 지점입니다.
 *
 * 전부 port(interface)이므로 테스트에서는 InMemory 구현체·고정 시계로 바꿔 끼웁니다.
 * (docs/architecture.md 1.2, DEC-032)
 */
export interface AssessmentDeps {
  readonly repository: AssessmentRepository;
  readonly catalog: AssessmentCatalog;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export function toVersions(definition: AssessmentDefinition): AssessmentVersions {
  return {
    assessmentVersion: definition.assessmentVersion,
    contentVersion: definition.contentVersion,
    scoringVersion: definition.scoring.scoringVersion,
  };
}

/**
 * 저장된 세션을 지금 버전으로 계속 진행해도 되는지 확인합니다. (docs/architecture.md 7.3)
 *
 * - assessmentVersion 이 다르면 문항 구성이 달라졌으므로 재시작
 * - scoringVersion 이 다르면 점수의 의미가 달라졌으므로 재시작
 * - contentVersion 만 다르면 문구만 바뀐 것이므로 계속 진행
 */
export function isCompatible(
  session: AssessmentSession,
  definition: AssessmentDefinition,
): boolean {
  return (
    session.versions.assessmentVersion === definition.assessmentVersion &&
    session.versions.scoringVersion === definition.scoring.scoringVersion
  );
}

export function ensureCompatible(
  session: AssessmentSession,
  definition: AssessmentDefinition,
): Result<AssessmentSession, AssessmentError> {
  if (isCompatible(session, definition)) {
    return ok(session);
  }
  return err(
    assessmentError(
      "VERSION_MISMATCH",
      `저장된 세션(assessment ${session.versions.assessmentVersion} / scoring ${session.versions.scoringVersion})이 현재 버전(assessment ${definition.assessmentVersion} / scoring ${definition.scoring.scoringVersion})과 다릅니다.`,
    ),
  );
}
