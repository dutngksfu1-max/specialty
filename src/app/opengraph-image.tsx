import { ImageResponse } from "next/og";

import { BRAND_NAME, HERO } from "@/lib/siteCopy";

/**
 * 링크 미리보기 이미지 (Phase 6)
 *
 * 카카오톡·슬랙·문자에 주소를 붙였을 때 보이는 카드입니다.
 * 연수 안내에 링크를 뿌리는 것이 이 서비스의 주된 전달 경로라 중요합니다.
 *
 * **개인 결과는 담지 않습니다.** 서비스 소개만 담습니다 (DEC-013 — 결과 공유는 이미지 저장만).
 * 결과 페이지는 아예 noindex이고 자체 OG 이미지도 만들지 않습니다.
 *
 * 한글 폰트를 쓰지 않는 아이콘(`appIcon.tsx`)과 달리 여기는 글자가 필요해서
 * `next/og`가 쓸 폰트를 직접 실어 줍니다. 안 실으면 한글이 네모(□)로 나옵니다.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND_NAME} — 교직 성향·업무 스타일 탐색`;

// design.md 토큰을 hex로 근사한 값입니다 (OG 생성기는 CSS 변수를 읽지 못합니다).
const BACKGROUND = "#fdfcf9"; // --color-background (sand-50)
const SURFACE = "#ffffff"; // --color-surface
const FOREGROUND = "#211f1b"; // --color-foreground (sand-950)
const MUTED = "#6f6a61"; // --color-foreground-muted (sand-700)
const BORDER = "#e8e4dc"; // --color-border (sand-200)
const SAGE = "#5c7a68"; // --color-primary (sage-600)
const CLAY = "#c4855a"; // --color-accent (clay-600)

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    // 저장소에 실려 있는 폰트를 빌드 시점에 그대로 읽습니다 (DEC-030 — 자체 호스팅).
    const response = await fetch(new URL("../assets/fonts/PretendardVariable.woff2", import.meta.url));
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    // 폰트를 못 읽어도 카드 자체는 나가야 합니다. 링크 미리보기가 통째로 사라지는 것보다 낫습니다.
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKGROUND,
          padding: 80,
          fontFamily: font === null ? "sans-serif" : "Pretendard",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* 아이콘과 같은 세 줄 마크 */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: SAGE,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 7,
            }}
          >
            <div style={{ width: 34, height: 5, borderRadius: 5, background: BACKGROUND }} />
            <div style={{ width: 21, height: 5, borderRadius: 5, background: CLAY }} />
            <div style={{ width: 29, height: 5, borderRadius: 5, background: BACKGROUND }} />
          </div>
          <span style={{ fontSize: 30, color: MUTED, letterSpacing: "-0.01em" }}>{BRAND_NAME}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 72,
              lineHeight: 1.25,
              fontWeight: 700,
              color: FOREGROUND,
              letterSpacing: "-0.03em",
            }}
          >
            {HERO.title}
          </span>
          <span style={{ marginTop: 24, fontSize: 32, color: MUTED }}>{HERO.subtitle}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            gap: 12,
            padding: "14px 24px",
            borderRadius: 10,
            border: `1px solid ${BORDER}`,
            background: SURFACE,
            fontSize: 24,
            color: MUTED,
          }}
        >
          응답은 브라우저에만 저장됩니다
        </div>
      </div>
    ),
    {
      ...size,
      fonts:
        font === null
          ? undefined
          : [{ name: "Pretendard", data: font, style: "normal" as const, weight: 400 as const }],
    },
  );
}
