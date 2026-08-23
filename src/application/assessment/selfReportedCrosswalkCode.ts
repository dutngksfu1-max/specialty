import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import {
  isSelfReportedCrosswalkCode,
  normalizeSelfReportedCrosswalkCode,
} from "@/domain/assessment/session/selfReportedCrosswalkCode";
import { err, ok, type Result } from "@/domain/shared/result";
import type { AssessmentDeps } from "@/application/assessment/dependencies";

export interface SelfReportedCrosswalkCodeDeps {
  readonly preferences: PreferencesRepository;
}

export async function loadSelfReportedCrosswalkCode(
  deps: SelfReportedCrosswalkCodeDeps,
): Promise<Result<string | null, AssessmentError>> {
  const loaded = await deps.preferences.loadSelfReportedCrosswalkCode();
  if (!loaded.ok) return err(loaded.error);
  return ok(isSelfReportedCrosswalkCode(loaded.value) ? loaded.value : null);
}

export async function saveSelfReportedCrosswalkCode(
  deps: SelfReportedCrosswalkCodeDeps,
  raw: string,
): Promise<Result<string | null, AssessmentError>> {
  const normalized = normalizeSelfReportedCrosswalkCode(raw);
  const value = isSelfReportedCrosswalkCode(normalized) ? normalized : null;
  const saved = await deps.preferences.saveSelfReportedCrosswalkCode(value);
  if (!saved.ok) return err(saved.error);
  return ok(value);
}

/** 저장된 결과가 이미 있어도 랜딩에서 바꾼 값이 즉시 비교표에 반영되게 함께 갱신합니다. */
export async function updateSelfReportedCrosswalkCode(
  deps: AssessmentDeps & SelfReportedCrosswalkCodeDeps,
  input: { readonly slug: string; readonly raw: string },
): Promise<Result<string | null, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);

  const saved = await saveSelfReportedCrosswalkCode(deps, input.raw);
  if (!saved.ok) return err(saved.error);
  const code = saved.value;

  const session = await deps.repository.loadSession(found.value.id);
  if (!session.ok) return err(session.error);
  if (session.value !== null) {
    const savedSession = await deps.repository.saveSession({
      ...session.value,
      selfReportedCrosswalkCode: code,
      updatedAt: deps.clock.now(),
    });
    if (!savedSession.ok) return err(savedSession.error);
  }

  const snapshot = await deps.repository.loadResultSnapshot(found.value.id);
  if (!snapshot.ok) return err(snapshot.error);
  if (snapshot.value !== null) {
    const savedSnapshot = await deps.repository.saveResultSnapshot({
      ...snapshot.value,
      selfReportedCrosswalkCode: code,
    });
    if (!savedSnapshot.ok) return err(savedSnapshot.error);
  }

  return ok(code);
}
