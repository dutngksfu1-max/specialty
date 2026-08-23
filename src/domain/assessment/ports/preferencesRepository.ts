import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { CharacterGender } from "@/domain/assessment/session/characterGender";
import type { Result } from "@/domain/shared/result";

/**
 * 검사와 무관하게 기억해 두는 사용자 설정 (docs/architecture.md 6.2의 `preferences` 스토어)
 *
 * 닉네임과 결과 캐릭터 성별은 세션이 만들어지기 전(랜딩 화면)에도 입력할 수 있어야 해서
 * 세션과 별도로 보관합니다. 물론 브라우저 안에만 저장됩니다.
 */
export interface PreferencesRepository {
  loadNickname(): Promise<Result<string | null, AssessmentError>>;
  saveNickname(nickname: string): Promise<Result<void, AssessmentError>>;
  loadCharacterGender(): Promise<Result<CharacterGender | null, AssessmentError>>;
  saveCharacterGender(gender: CharacterGender): Promise<Result<void, AssessmentError>>;
  loadSelfReportedCrosswalkCode(): Promise<Result<string | null, AssessmentError>>;
  saveSelfReportedCrosswalkCode(code: string | null): Promise<Result<void, AssessmentError>>;
  clearAll(): Promise<Result<void, AssessmentError>>;
}
