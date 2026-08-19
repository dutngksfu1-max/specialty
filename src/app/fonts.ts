import localFont from "next/font/local";

/**
 * Pretendard Variable (SIL Open Font License) — docs/design.md 3.1, DEC-012 / DEC-030
 *
 * 폰트 파일을 저장소에 직접 담아 우리 서버에서 내려보냅니다.
 *   - 외부 CDN 요청이 없어 오프라인에서도 같은 글꼴로 보입니다
 *   - 사용자 기기에 폰트가 깔려 있는지와 무관하게 항상 같은 화면이 나옵니다
 *
 * display: "block" — 폰트가 준비될 때까지 글자를 잠시 감춥니다.
 * "swap"이면 그 사이 맑은 고딕 같은 시스템 폰트가 잠깐 보였다가 바뀌는데,
 * 그 깜빡임을 없애기 위한 선택입니다 (DEC-035).
 */
export const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  weight: "45 920",
  style: "normal",
  variable: "--font-pretendard",
  display: "block",
  preload: true,
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "sans-serif",
  ],
});
