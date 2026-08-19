import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide } from "@/domain/assessment/model/definition";

/** docs/architecture.md 4.3 */
export interface CollaborationProfile {
  /** 호흡이 자연스러운 스타일 */
  readonly naturalFit: readonly string[];
  /** 조율하면 더 편한 스타일 */
  readonly needsTuning: readonly string[];
}

/**
 * 장면이 붙은 서술 한 줄 (contentVersion 3.0.0)
 *
 * `scene`은 "수업" "생활지도" "업무" "동료" "학부모" 같은 교직 장면 이름입니다.
 * 문구를 엔진이 모르게 두려고 라벨 자체를 콘텐츠가 소유합니다 (DEC-004와 같은 원칙).
 * 화면에서는 칩으로 표시해, 선생님이 필요한 장면만 골라 읽을 수 있게 합니다.
 */
export interface SceneNote {
  readonly scene: string;
  readonly text: string;
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
  readonly shiningMoments: readonly SceneNote[];
  /** 바쁠 때 나타날 수 있는 모습 */
  readonly underPressure: readonly SceneNote[];
  /** 동료와 함께 일할 때 */
  readonly withColleagues: readonly SceneNote[];
  readonly collaboration: CollaborationProfile;
  /** 내일 해 볼 것 — 성향 서술이 아니라 실제로 해 볼 수 있는 행동 */
  readonly nextSteps: readonly string[];
  /** 동료와 나눌 질문 — 연수 아이스브레이킹에 쓰입니다 */
  readonly talkingPoints: readonly string[];
}
