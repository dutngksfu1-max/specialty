import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide, TieBreakRuleId } from "@/domain/assessment/model/definition";

/**
 * 이 축의 방향이 **어디서 나왔는지** (DEC-063 · DEC-068)
 *
 * | 값 | 뜻 |
 * |---|---|
 * | `score` | 축 점수가 0이 아니라 합계가 그대로 방향을 정했습니다 |
 * | `tiebreak` | 축 점수는 0이지만 동점 보정 규칙이 방향을 찾았습니다 |
 * | `default` | 0점이고 보정으로도 갈리지 않아 콘텐츠의 기본 방향을 사용했습니다 |
 *
 * 화면은 출처에 따라 문장을 바꾸지 않습니다. 이 값은 채점 근거를 추적하기 위한
 * 내부 데이터이고, 사용자에게는 연속 점수의 차이를 게이지로 보여 줍니다.
 */
export type AxisDirectionSource = "score" | "tiebreak" | "default";

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
   * 방향. 점수가 같아도 동점 보정 또는 `axis.defaultPole`로 한쪽을 정합니다 (DEC-068).
   */
  readonly direction: PoleSide;
  readonly directionSource: AxisDirectionSource;
  /** 방향을 정한 보정 규칙. `directionSource`가 `tiebreak`일 때만 있습니다 */
  readonly tieBreakRuleId?: TieBreakRuleId;
  readonly intensityBandId: string;
}

export interface AssessmentScore {
  readonly axisScores: readonly AxisScore[];
  readonly resultKey: ResultKey;
}
