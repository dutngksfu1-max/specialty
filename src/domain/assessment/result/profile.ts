import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide } from "@/domain/assessment/model/definition";

/** docs/architecture.md 4.3 */
export interface CollaborationProfile {
  /** 호흡이 자연스러운 스타일 */
  readonly naturalFit: readonly string[];
  /** 조율하면 더 편한 스타일 */
  readonly needsTuning: readonly string[];
}

export interface ResultProfile {
  /** 내부 식별자. 화면에 그대로 노출하지 않습니다. */
  readonly key: ResultKey;
  /** 축 → 방향 조합 */
  readonly poles: Readonly<Record<AxisId, PoleSide>>;
  readonly title: string;
  readonly oneLiner: string;
  /** 나의 교직 리듬 */
  readonly rhythm: string;
  /** 교실에서 빛나는 순간 */
  readonly shiningMoments: readonly string[];
  /** 바쁠 때 나타날 수 있는 모습 */
  readonly underPressure: readonly string[];
  /** 동료와 함께 일할 때 */
  readonly withColleagues: readonly string[];
  readonly collaboration: CollaborationProfile;
}
