/**
 * 닉네임 정책 (DEC-009)
 *
 * - 선택 입력입니다. 비워 두면 화면에서 '선생님'으로 부릅니다
 * - 1~12자. 로그인이 아니라 "어떻게 불러 드릴까요"에 가깝습니다
 * - 서버로 보내지 않습니다. 브라우저에만 저장됩니다
 */
export const NICKNAME_MAX_LENGTH = 12;
export const DEFAULT_NICKNAME = "선생님";

/** 앞뒤 공백을 없애고 최대 길이로 자릅니다. */
export function normalizeNickname(raw: string): string {
  return [...raw.trim()].slice(0, NICKNAME_MAX_LENGTH).join("");
}

/** 화면에 표시할 이름. 비어 있으면 기본값을 씁니다. */
export function displayNickname(nickname: string): string {
  const normalized = normalizeNickname(nickname);
  return normalized.length === 0 ? DEFAULT_NICKNAME : normalized;
}
