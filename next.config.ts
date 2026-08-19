import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 응답 헤더 — 우리가 서버로 보내는 개인정보가 없다는 원칙을 보조합니다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // 라이선스 고지 등 정적 파일. 실제 폰트는 next/font가 해시 붙은 경로로 내보내며
        // 그쪽은 Next가 알아서 immutable 캐시 헤더를 붙입니다.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
