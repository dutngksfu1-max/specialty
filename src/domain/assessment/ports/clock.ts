/**
 * 현재 시각 port (DEC-032)
 *
 * Application이 `new Date()`를 직접 부르면 테스트에서 시각을 고정할 수 없습니다.
 * Repository와 같은 방식으로 주입받아, 같은 입력이 항상 같은 결과를 내게 합니다.
 */
export interface Clock {
  /** ISO 8601 문자열 (예: "2026-08-19T09:00:00.000Z") */
  now(): string;
}
