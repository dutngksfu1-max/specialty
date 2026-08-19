import localFont from "next/font/local";

/**
 * Pretendard Variable (SIL Open Font License) — docs/design.md 3.1, DEC-012 / DEC-030
 *
 * 폰트 파일을 저장소에 직접 담아 우리 서버에서 내려보냅니다.
 *   - 외부 CDN 요청이 없어 오프라인에서도 같은 글꼴로 보입니다
 *   - 사용자 기기에 폰트가 깔려 있는지와 무관하게 항상 같은 화면이 나옵니다
 *
 * **원본이 `src/assets/`에 있는 이유** (Phase 6 성능 정리)
 * `public/`에 두면 그 파일이 그대로 웹에 서빙되고, Service Worker가 **쓰지도 않는
 * 2MB 사본을 프리캐시**합니다. 실제로 쓰이는 파일은 next/font가 만드는
 * `/_next/static/media/...` 쪽이라, public 사본은 설치 용량만 2MB 늘릴 뿐이었습니다.
 * `src/` 아래에 두면 빌드 입력으로만 쓰이고 서빙되지 않습니다.
 * (라이선스 고지 OFL.txt는 `public/fonts/`에 그대로 두어 공개 접근을 유지합니다)
 *
 * display: "block" — 폰트가 준비될 때까지 글자를 잠시 감춥니다.
 * "swap"이면 그 사이 맑은 고딕 같은 시스템 폰트가 잠깐 보였다가 바뀌는데,
 * 그 깜빡임을 없애기 위한 선택입니다 (DEC-035).
 */
export const pretendard = localFont({
  src: "../assets/fonts/PretendardVariable.woff2",
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
