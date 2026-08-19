import type { SessionId } from "@/domain/shared/ids";

/**
 * 식별자 생성 port (DEC-032)
 *
 * Application이 `crypto.randomUUID()`를 직접 부르면 테스트가 비결정적이 됩니다.
 */
export interface IdGenerator {
  newSessionId(): SessionId;
}
