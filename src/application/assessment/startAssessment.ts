import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { AssessmentSession } from "@/domain/assessment/session/session";
import { err, ok, type Result } from "@/domain/shared/result";

import {
  isCompatible,
  toVersions,
  type AssessmentDeps,
} from "@/application/assessment/dependencies";

export interface StartAssessmentInput {
  readonly slug: string;
  /** 비워 두면 기존 닉네임을 유지합니다. (DEC-009) */
  readonly nickname?: string;
  /** true면 기존 세션·응답·결과를 지우고 처음부터 다시 시작합니다. (DEC-010) */
  readonly restart?: boolean;
}

export interface StartAssessmentOutput {
  readonly definition: AssessmentDefinition;
  readonly session: AssessmentSession;
  /** 새로 만든 세션이면 true, 기존 세션을 이어 가는 경우 false */
  readonly isNew: boolean;
}

/**
 * 검사를 시작합니다.
 *
 * 이어서 할 수 있는 세션이 있으면 그것을 그대로 돌려주고,
 * 없거나 버전이 달라졌거나 restart 요청이면 새 세션을 만듭니다.
 * 새로 만들 때는 기존 데이터를 먼저 지웁니다 (검사당 세션 1개 — DEC-010).
 */
export async function startAssessment(
  deps: AssessmentDeps,
  input: StartAssessmentInput,
): Promise<Result<StartAssessmentOutput, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);
  const definition = found.value;

  const existing = await deps.repository.loadSession(definition.id);
  if (!existing.ok) return err(existing.error);

  const canResume =
    input.restart !== true && existing.value !== null && isCompatible(existing.value, definition);

  if (canResume && existing.value !== null) {
    const nickname = input.nickname ?? existing.value.nickname;
    if (nickname === existing.value.nickname) {
      return ok({ definition, session: existing.value, isNew: false });
    }

    const updated: AssessmentSession = {
      ...existing.value,
      nickname,
      updatedAt: deps.clock.now(),
    };
    const saved = await deps.repository.saveSession(updated);
    if (!saved.ok) return err(saved.error);

    return ok({ definition, session: updated, isNew: false });
  }

  const cleared = await deps.repository.clearAssessment(definition.id);
  if (!cleared.ok) return err(cleared.error);

  const startedAt = deps.clock.now();
  const session: AssessmentSession = {
    id: deps.idGenerator.newSessionId(),
    assessmentId: definition.id,
    nickname: input.nickname ?? "",
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    versions: toVersions(definition),
  };

  const saved = await deps.repository.saveSession(session);
  if (!saved.ok) return err(saved.error);

  return ok({ definition, session, isNew: true });
}
