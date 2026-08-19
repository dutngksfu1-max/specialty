import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide } from "@/domain/assessment/model/definition";

/** docs/architecture.md 4.4 */
export interface AxisScore {
  readonly axisId: AxisId;
  /** 연속 점수. 반드시 보존합니다 (PRD F-4.6) */
  readonly rawScore: number;
  readonly minScore: number;
  readonly maxScore: number;
  /** 0~1. rawScore에서 파생되는 시각화용 값 */
  readonly normalized: number;
  /** rawScore가 0이면 axis.defaultPole */
  readonly direction: PoleSide;
  readonly isBalanced: boolean;
  readonly intensityBandId: string;
}

export interface AssessmentScore {
  readonly axisScores: readonly AxisScore[];
  readonly resultKey: ResultKey;
}
