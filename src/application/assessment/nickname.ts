import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import { normalizeNickname } from "@/domain/assessment/session/nickname";
import { err, ok, type Result } from "@/domain/shared/result";

export interface NicknameDeps {
  readonly preferences: PreferencesRepository;
}

/** 기억해 둔 닉네임을 불러옵니다. 없으면 빈 문자열입니다. */
export async function loadNickname(
  deps: NicknameDeps,
): Promise<Result<string, AssessmentError>> {
  const loaded = await deps.preferences.loadNickname();
  if (!loaded.ok) return err(loaded.error);
  return ok(loaded.value === null ? "" : normalizeNickname(loaded.value));
}

/** 닉네임을 브라우저에 저장합니다. 길이·공백은 도메인 규칙으로 정리합니다. */
export async function saveNickname(
  deps: NicknameDeps,
  raw: string,
): Promise<Result<string, AssessmentError>> {
  const nickname = normalizeNickname(raw);
  const saved = await deps.preferences.saveNickname(nickname);
  if (!saved.ok) return err(saved.error);
  return ok(nickname);
}
