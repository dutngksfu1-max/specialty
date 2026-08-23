/**
 * 결과 캐릭터에 반영하는 성별 선택값입니다 (DEC-054).
 * 성별 정체성을 추론하거나 채점에 사용하지 않습니다.
 */
export const CHARACTER_GENDERS = ["male", "female"] as const;

export type CharacterGender = (typeof CHARACTER_GENDERS)[number];

export function isCharacterGender(value: unknown): value is CharacterGender {
  return CHARACTER_GENDERS.some((gender) => gender === value);
}
