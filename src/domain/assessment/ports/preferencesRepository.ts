import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { Result } from "@/domain/shared/result";

/**
 * 검사와 무관하게 기억해 두는 사용자 설정 (docs/architecture.md 6.2의 `preferences` 스토어)
 *
 * 지금은 닉네임 하나뿐입니다. 세션이 만들어지기 전(랜딩 화면)에도 입력할 수 있어야 해서
 * 세션과 별도로 보관합니다. 물론 브라우저 안에만 저장됩니다.
 */
export interface PreferencesRepository {
  loadNickname(): Promise<Result<string | null, AssessmentError>>;
  saveNickname(nickname: string): Promise<Result<void, AssessmentError>>;
  clearAll(): Promise<Result<void, AssessmentError>>;
}
