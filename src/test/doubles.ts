import type { Clock } from "@/domain/assessment/ports/clock";
import type { IdGenerator } from "@/domain/assessment/ports/idGenerator";
import { toSessionId } from "@/domain/shared/ids";

/**
 * 테스트용 시계 — 시각을 직접 정하고 원할 때만 앞으로 감습니다.
 * 덕분에 "같은 입력 → 같은 결과"를 Application 계층에서도 확인할 수 있습니다 (DEC-032).
 */
export function createFixedClock(start = "2026-08-19T09:00:00.000Z") {
  let current = start;

  const clock: Clock = {
    now: () => current,
  };

  return {
    clock,
    set(next: string) {
      current = next;
    },
  };
}

/** 테스트용 id 생성기 — session-1, session-2 … 순번으로 만듭니다. */
export function createSequentialIdGenerator(prefix = "session") {
  let counter = 0;

  const idGenerator: IdGenerator = {
    newSessionId: () => {
      counter += 1;
      return toSessionId(`${prefix}-${counter}`);
    },
  };

  return { idGenerator, get issued() {
    return counter;
  } };
}
