import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide, TieBreakRuleId } from "@/domain/assessment/model/definition";

/**
 * 이 축의 방향이 **어디서 나왔는지** (DEC-063)
 *
 * | 값 | 뜻 |
 * |---|---|
 * | `score` | 축 점수가 0이 아니라 합계가 그대로 방향을 정했습니다 |
 * | `tiebreak` | 축 점수는 0이지만 동점 보정 규칙이 방향을 찾았습니다 |
 * | `unresolved` | 0점이고 보정으로도 갈리지 않았습니다. **진짜 균형**입니다 |
 *
 * 화면이 이 값을 봐야 하는 이유: `unresolved`만 균형으로 다뤄야 하고,
 * `tiebreak`는 방향이 있되 **아주 근소한 차이**라 조심스럽게 말해야 합니다.
 */
export type AxisDirectionSource = "score" | "tiebreak" | "unresolved";

/** docs/architecture.md 4.4 */
export interface AxisScore {
  readonly axisId: AxisId;
  /** 연속 점수. 반드시 보존합니다 (PRD F-4.6) */
  readonly rawScore: number;
  readonly minScore: number;
  readonly maxScore: number;
  /** 0~1. rawScore에서 파생되는 시각화용 값 */
  readonly normalized: number;
  /**
   * 방향. 동점 보정이 실패했을 때만 `axis.defaultPole`이 됩니다 (DEC-001 · DEC-063).
   * 이 값 하나만 보고 균형인지 판단하지 마세요 — `directionSource`를 함께 보셔야 합니다.
   */
  readonly direction: PoleSide;
  /** 축 점수가 정확히 0인지. **보정 전** 사실이라 보정이 붙어도 그대로 남습니다 */
  readonly isBalanced: boolean;
  readonly directionSource: AxisDirectionSource;
  /** 방향을 정한 보정 규칙. `directionSource`가 `tiebreak`일 때만 있습니다 */
  readonly tieBreakRuleId?: TieBreakRuleId;
  readonly intensityBandId: string;
}

export interface AssessmentScore {
  readonly axisScores: readonly AxisScore[];
  readonly resultKey: ResultKey;
}
