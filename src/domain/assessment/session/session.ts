import type { AssessmentId, QuestionId, SessionId } from "@/domain/shared/ids";
import type { CharacterGender } from "@/domain/assessment/session/characterGender";

/** docs/architecture.md 4.4 */
export interface AssessmentVersions {
  readonly assessmentVersion: number;
  readonly contentVersion: string;
  readonly scoringVersion: number;
}

export interface AssessmentSession {
  readonly id: SessionId;
  readonly assessmentId: AssessmentId;
  /** 비어 있으면 화면에서 '선생님'으로 표시합니다 (DEC-009) */
  readonly nickname: string;
  /** 결과 캐릭터에만 반영합니다. null은 기존 저장 데이터 호환용입니다 (DEC-054). */
  readonly characterGender: CharacterGender | null;
  /** 사용자가 직접 입력한 선택 코드. 이전 저장 데이터에는 없을 수 있습니다. */
  readonly selfReportedCrosswalkCode?: string | null;
  /** ISO 8601 문자열 */
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  /** 시작 시점 버전 스냅샷 */
  readonly versions: AssessmentVersions;
}

export interface AssessmentResponse {
  readonly sessionId: SessionId;
  readonly questionId: QuestionId;
  /** 척도 옵션 중 하나 */
  readonly value: number;
  readonly answeredAt: string;
}
