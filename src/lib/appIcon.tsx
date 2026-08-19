import { ImageResponse } from "next/og";

/**
 * 앱 아이콘 (DEC-031 A안 — 워드마크와 같은 톤의 단순 마크)
 *
 * 글자를 넣지 않고 도형만 씁니다. 아이콘을 그릴 때는 브라우저 폰트를 쓸 수 없어서,
 * 한글을 넣으려면 폰트 파일을 따로 실어야 하고 그만큼 무거워집니다.
 * 세 줄 막대는 "읽는 프로필"을, 가운데 클레이색 줄은 포인트 색을 뜻합니다.
 *
 * 색은 design.md의 토큰을 hex로 근사한 값입니다.
 * (아이콘 생성기는 CSS 변수를 읽지 못합니다)
 */
const SAGE = "#5c7a68"; // --color-primary (sage-600)
const SAND = "#fdfcf9"; // --color-primary-foreground (sand-50)
const CLAY = "#c4855a"; // --color-accent (clay-600)

export const ICON_CONTENT_TYPE = "image/png";

/**
 * @param size    한 변 길이(px)
 * @param maskable true면 안전 영역을 지키기 위해 여백을 크게 둡니다.
 *                 (안드로이드가 아이콘을 원·사각형 등으로 잘라 내기 때문입니다)
 */
export function renderAppIcon(size: number, maskable = false): ImageResponse {
  const pad = maskable ? size * 0.26 : size * 0.18;
  const inner = size - pad * 2;
  const bar = Math.max(2, Math.round(inner * 0.14));
  const gap = Math.max(2, Math.round(inner * 0.13));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: SAGE,
          // maskable은 화면 전체를 채우고, 일반 아이콘은 모서리를 둥글게 깎습니다.
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap,
            width: inner,
          }}
        >
          <div style={{ width: "100%", height: bar, borderRadius: bar, background: SAND }} />
          <div style={{ width: "62%", height: bar, borderRadius: bar, background: CLAY }} />
          <div style={{ width: "86%", height: bar, borderRadius: bar, background: SAND }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
