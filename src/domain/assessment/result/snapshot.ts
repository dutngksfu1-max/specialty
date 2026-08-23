import type { AssessmentId, SessionId } from "@/domain/shared/ids";
import type { AssessmentScore } from "@/domain/assessment/scoring/score";
import type { AssessmentVersions } from "@/domain/assessment/session/session";
import type { CharacterGender } from "@/domain/assessment/session/characterGender";

/** docs/architecture.md 4.4 */
export interface ResultSnapshot {
  readonly assessmentId: AssessmentId;
  readonly sessionId: SessionId;
  readonly nickname: string;
  /** 결과를 만들 때 선택한 캐릭터 성별. null은 기존 결과 호환용입니다. */
  readonly characterGender: CharacterGender | null;
  /** 검사 시작 전에 사용자가 직접 입력한 선택 코드 */
  readonly selfReportedCrosswalkCode?: string | null;
  readonly score: AssessmentScore;
  readonly versions: AssessmentVersions;
  readonly completedAt: string;
}
