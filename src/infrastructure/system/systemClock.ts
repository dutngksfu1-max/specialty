import type { Clock } from "@/domain/assessment/ports/clock";

/** 실제 시각을 쓰는 Clock 구현체. 테스트에서는 고정 시계로 교체합니다 (DEC-032). */
export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
