import type { AssessmentDeps } from "@/application/assessment/dependencies";
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

/**
 * 결과 화면에서 닉네임을 고칩니다. (PRD F-2.4)
 *
 * 이미 저장된 세션과 결과 스냅샷의 이름도 함께 맞춰 줍니다.
 * 그러지 않으면 화면에는 새 이름이, 저장된 결과에는 옛 이름이 남아 어긋납니다.
 * 점수는 건드리지 않습니다 — 이름은 채점과 아무 관계가 없습니다.
 */
export async function updateNickname(
  deps: AssessmentDeps & NicknameDeps,
  input: { readonly slug: string; readonly nickname: string },
): Promise<Result<string, AssessmentError>> {
  const found = deps.catalog.findBySlug(input.slug);
  if (!found.ok) return err(found.error);
  const definition = found.value;

  const nickname = normalizeNickname(input.nickname);

  const savedPreference = await deps.preferences.saveNickname(nickname);
  if (!savedPreference.ok) return err(savedPreference.error);

  const session = await deps.repository.loadSession(definition.id);
  if (!session.ok) return err(session.error);
  if (session.value !== null) {
    const savedSession = await deps.repository.saveSession({
      ...session.value,
      nickname,
      updatedAt: deps.clock.now(),
    });
    if (!savedSession.ok) return err(savedSession.error);
  }

  const snapshot = await deps.repository.loadResultSnapshot(definition.id);
  if (!snapshot.ok) return err(snapshot.error);
  if (snapshot.value !== null) {
    const savedSnapshot = await deps.repository.saveResultSnapshot({
      ...snapshot.value,
      nickname,
    });
    if (!savedSnapshot.ok) return err(savedSnapshot.error);
  }

  return ok(nickname);
}
