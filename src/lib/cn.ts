type ClassValue = string | number | false | null | undefined;

/**
 * 조건부 className을 이어 붙이는 아주 얇은 유틸입니다.
 *
 * clsx·tailwind-merge를 쓰지 않는 이유: 컴포넌트가 스스로 충돌하는 클래스를 만들지 않도록
 * 설계했기 때문에 병합 로직이 필요하지 않고, dependency를 하나라도 줄이는 편이 낫습니다.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
