import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type {
  AssessmentResponse,
  AssessmentSession,
} from "@/domain/assessment/session/session";
import type { AssessmentId, SessionId } from "@/domain/shared/ids";
import type { Result } from "@/domain/shared/result";

/**
 * 저장소 계약 (docs/architecture.md 6.1)
 *
 * Domain은 "무엇을 저장하는가"만 정하고, "어디에 저장하는가"는 모릅니다.
 * IndexedDB · InMemory · (향후) Supabase가 이 interface를 각각 구현합니다.
 */
export interface AssessmentRepository {
  loadSession(
    assessmentId: AssessmentId,
  ): Promise<Result<AssessmentSession | null, AssessmentError>>;
  saveSession(session: AssessmentSession): Promise<Result<void, AssessmentError>>;

  loadResponses(
    sessionId: SessionId,
  ): Promise<Result<readonly AssessmentResponse[], AssessmentError>>;
  saveResponse(response: AssessmentResponse): Promise<Result<void, AssessmentError>>;

  saveResultSnapshot(snapshot: ResultSnapshot): Promise<Result<void, AssessmentError>>;
  loadResultSnapshot(
    assessmentId: AssessmentId,
  ): Promise<Result<ResultSnapshot | null, AssessmentError>>;

  /** 다시 검사하기 — 해당 검사의 세션·응답·결과를 모두 삭제 (DEC-010) */
  clearAssessment(assessmentId: AssessmentId): Promise<Result<void, AssessmentError>>;

  /** 사용자 요청에 의한 전체 삭제 (DEC-015) */
  clearAll(): Promise<Result<void, AssessmentError>>;
}
