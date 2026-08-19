/**
 * 오류 코드 (docs/architecture.md 8.1)
 *
 * 이 목록에 없는 코드를 새로 만들지 않습니다.
 * 사용자에게 보여 줄 한국어 문구는 UI 계층의 lib/errorMessages.ts가 담당합니다.
 */
export type AssessmentErrorCode =
  | "ASSESSMENT_NOT_FOUND"
  | "VERSION_MISMATCH"
  | "SESSION_NOT_FOUND"
  | "INCOMPLETE_RESPONSES"
  | "INVALID_RESPONSE"
  | "DRAFT_CORRUPTED"
  | "PERSISTENCE_FAILED"
  | "RESULT_PROFILE_NOT_FOUND"
  | "NETWORK_UNAVAILABLE"
  | "INVALID_CONTENT_PACKAGE";

export interface AssessmentError {
  readonly code: AssessmentErrorCode;
  /** 개발자용 설명. 화면에 노출하지 않습니다. */
  readonly detail?: string;
  readonly cause?: unknown;
}

export const assessmentError = (
  code: AssessmentErrorCode,
  detail?: string,
  cause?: unknown,
): AssessmentError => ({ code, detail, cause });
