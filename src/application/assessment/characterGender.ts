import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import {
  isCharacterGender,
  type CharacterGender,
} from "@/domain/assessment/session/characterGender";
import { err, ok, type Result } from "@/domain/shared/result";

export interface CharacterGenderDeps {
  readonly preferences: PreferencesRepository;
}

/** 브라우저에 기억해 둔 결과 캐릭터 성별을 불러옵니다. */
export async function loadCharacterGender(
  deps: CharacterGenderDeps,
): Promise<Result<CharacterGender | null, AssessmentError>> {
  const loaded = await deps.preferences.loadCharacterGender();
  if (!loaded.ok) return err(loaded.error);
  return ok(isCharacterGender(loaded.value) ? loaded.value : null);
}

/** 결과 캐릭터 성별을 이 브라우저에만 저장합니다. */
export async function saveCharacterGender(
  deps: CharacterGenderDeps,
  gender: CharacterGender,
): Promise<Result<CharacterGender, AssessmentError>> {
  const saved = await deps.preferences.saveCharacterGender(gender);
  if (!saved.ok) return err(saved.error);
  return ok(gender);
}
