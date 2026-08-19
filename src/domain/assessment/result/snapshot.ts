import type { AssessmentId, SessionId } from "@/domain/shared/ids";
import type { AssessmentScore } from "@/domain/assessment/scoring/score";
import type { AssessmentVersions } from "@/domain/assessment/session/session";

/** docs/architecture.md 4.4 */
export interface ResultSnapshot {
  readonly assessmentId: AssessmentId;
  readonly sessionId: SessionId;
  readonly nickname: string;
  readonly score: AssessmentScore;
  readonly versions: AssessmentVersions;
  readonly completedAt: string;
}
