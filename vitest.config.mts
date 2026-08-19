import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest는 tsconfig의 paths를 자동으로 읽지 않으므로,
 * `@/*` alias를 여기에 다시 알려 줍니다.
 * (추가 dependency 없이 해결하기 위해 resolve.alias를 직접 지정합니다.)
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // .tsx도 포함합니다 — 컴포넌트를 renderToStaticMarkup으로 찍어 보는 테스트가 있습니다.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/application/**", "src/infrastructure/content/**"],
    },
  },
});
