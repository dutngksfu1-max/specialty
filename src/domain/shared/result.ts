/**
 * 성공/실패를 예외 대신 값으로 표현합니다. (docs/architecture.md 4.1)
 *
 * Domain / Application은 `throw`하지 않고 항상 이 타입을 반환합니다.
 * 호출하는 쪽이 `if (result.ok)`로 분기하면 TypeScript가 나머지 타입을 좁혀 줍니다.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
