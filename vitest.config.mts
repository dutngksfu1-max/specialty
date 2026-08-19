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
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/application/**", "src/infrastructure/content/**"],
    },
  },
});
