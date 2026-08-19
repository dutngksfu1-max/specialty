import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { AssessmentRepository } from "@/domain/assessment/ports/assessmentRepository";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type {
  AssessmentResponse,
  AssessmentSession,
} from "@/domain/assessment/session/session";
import type { AssessmentId, QuestionId, SessionId } from "@/domain/shared/ids";
import { ok, type Result } from "@/domain/shared/result";

/**
 * 메모리 저장소.
 *
 * 두 가지 용도가 있습니다.
 *   1) 테스트 — IndexedDB 없이 유스케이스를 검증
 *   2) 폴백  — 시크릿 모드처럼 IndexedDB를 열 수 없을 때 (안내 배너와 함께)
 *
 * 새로고침하면 사라집니다. 영속 저장은 IndexedDB 구현체(Phase 2)가 담당합니다.
 */
export class InMemoryAssessmentRepository
  implements AssessmentRepository, PreferencesRepository
{
  private readonly sessions = new Map<string, AssessmentSession>();
  private readonly responses = new Map<string, Map<string, AssessmentResponse>>();
  private readonly results = new Map<string, ResultSnapshot>();
  private nickname: string | null = null;

  async loadSession(
    assessmentId: AssessmentId,
  ): Promise<Result<AssessmentSession | null, AssessmentError>> {
    return ok(this.sessions.get(String(assessmentId)) ?? null);
  }

  async saveSession(session: AssessmentSession): Promise<Result<void, AssessmentError>> {
    this.sessions.set(String(session.assessmentId), session);
    return ok(undefined);
  }

  async loadResponses(
    sessionId: SessionId,
  ): Promise<Result<readonly AssessmentResponse[], AssessmentError>> {
    const bySession = this.responses.get(String(sessionId));
    return ok(bySession === undefined ? [] : [...bySession.values()]);
  }

  async saveResponse(response: AssessmentResponse): Promise<Result<void, AssessmentError>> {
    const key = String(response.sessionId);
    const bySession = this.responses.get(key) ?? new Map<string, AssessmentResponse>();
    bySession.set(String(response.questionId), response);
    this.responses.set(key, bySession);
    return ok(undefined);
  }

  async saveResultSnapshot(snapshot: ResultSnapshot): Promise<Result<void, AssessmentError>> {
    this.results.set(String(snapshot.assessmentId), snapshot);
    return ok(undefined);
  }

  async loadResultSnapshot(
    assessmentId: AssessmentId,
  ): Promise<Result<ResultSnapshot | null, AssessmentError>> {
    return ok(this.results.get(String(assessmentId)) ?? null);
  }

  async clearAssessment(assessmentId: AssessmentId): Promise<Result<void, AssessmentError>> {
    const key = String(assessmentId);
    const session = this.sessions.get(key);
    if (session !== undefined) {
      this.responses.delete(String(session.id));
    }
    this.sessions.delete(key);
    this.results.delete(key);
    return ok(undefined);
  }

  async clearAll(): Promise<Result<void, AssessmentError>> {
    this.sessions.clear();
    this.responses.clear();
    this.results.clear();
    this.nickname = null;
    return ok(undefined);
  }

  async loadNickname(): Promise<Result<string | null, AssessmentError>> {
    return ok(this.nickname);
  }

  async saveNickname(nickname: string): Promise<Result<void, AssessmentError>> {
    this.nickname = nickname;
    return ok(undefined);
  }

  /** 테스트 편의용 — 저장된 응답 수를 셉니다. */
  countResponses(sessionId: SessionId): number {
    return this.responses.get(String(sessionId))?.size ?? 0;
  }

  /** 테스트 편의용 — 특정 문항의 저장값을 봅니다. */
  peekResponse(sessionId: SessionId, questionId: QuestionId): number | undefined {
    return this.responses.get(String(sessionId))?.get(String(questionId))?.value;
  }
}
