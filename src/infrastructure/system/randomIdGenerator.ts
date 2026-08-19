import type { IdGenerator } from "@/domain/assessment/ports/idGenerator";
import { toSessionId } from "@/domain/shared/ids";

function newId(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  // randomUUID를 지원하지 않는 아주 오래된 환경 대비 폴백
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 실제 난수를 쓰는 IdGenerator 구현체. 테스트에서는 순번 생성기로 교체합니다 (DEC-032). */
export const randomIdGenerator: IdGenerator = {
  newSessionId: () => toSessionId(newId()),
};
