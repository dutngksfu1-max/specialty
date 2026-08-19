"use client";

/**
 * 루트 레이아웃까지 실패했을 때의 마지막 안전망입니다.
 * 여기서는 앱의 CSS·폰트를 쓸 수 없으므로 인라인 스타일만 씁니다.
 */
export default function GlobalError({ reset }: { readonly reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          padding: "48px 20px",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif',
          lineHeight: 1.7,
          color: "#2b2a26",
          background: "#fdfcf9",
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>잠시 문제가 생겼어요</h1>
          <p style={{ marginTop: 12 }}>
            저장된 응답은 이 브라우저에 그대로 있어요. 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 10,
              border: "none",
              background: "#5c7a68",
              color: "#fdfcf9",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
