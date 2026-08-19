import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * 계층 규칙 (docs/architecture.md 2장)
 *
 *   features / app  ──▶  application  ──▶  domain  ◀── infrastructure(구현)
 *
 * glob 주의: `@/application/*` 는 슬래시를 넘지 않으므로 2단계 이상 경로를 잡지 못합니다.
 * 그래서 `["@/application", "@/application/**"]` 두 가지를 함께 넣습니다.
 */

/** domain: 어떤 프레임워크·인프라·상위 계층도 알지 못합니다. */
const domainRestrictedImports = {
  patterns: [
    {
      group: ["react", "react-dom", "react-dom/*", "next", "next/*"],
      message: "Domain은 프레임워크에 의존할 수 없습니다. (docs/architecture.md 2장)",
    },
    {
      group: ["idb", "idb/*", "@supabase/*", "html-to-image", "serwist", "@serwist/*"],
      message: "Domain은 인프라 라이브러리에 의존할 수 없습니다. (docs/architecture.md 2장)",
    },
    {
      group: [
        "@/application",
        "@/application/**",
        "@/infrastructure",
        "@/infrastructure/**",
        "@/features",
        "@/features/**",
        "@/app",
        "@/app/**",
        "@/components",
        "@/components/**",
        "@/lib",
        "@/lib/**",
      ],
      message: "Domain은 상위 계층을 import할 수 없습니다. (docs/architecture.md 2장)",
    },
  ],
};

/** application: domain만 알고, 구현체와 UI는 알지 못합니다. */
const applicationRestrictedImports = {
  patterns: [
    {
      group: ["react", "react-dom", "react-dom/*", "next", "next/*"],
      message: "Application은 프레임워크에 의존할 수 없습니다. (docs/architecture.md 2장)",
    },
    {
      group: ["idb", "idb/*", "@supabase/*", "html-to-image"],
      message: "Application은 인프라 라이브러리를 직접 import할 수 없습니다. Repository port를 주입받으세요.",
    },
    {
      group: [
        "@/infrastructure",
        "@/infrastructure/**",
        "@/features",
        "@/features/**",
        "@/app",
        "@/app/**",
        "@/components",
        "@/components/**",
      ],
      message: "Application은 하위 구현이나 UI를 import할 수 없습니다. (docs/architecture.md 2장)",
    },
  ],
};

/** features: Repository 구현체는 조립 지점(provider)에서만 참조합니다. */
const featuresRestrictedImports = {
  patterns: [
    {
      group: ["@/infrastructure/persistence", "@/infrastructure/persistence/**"],
      message: "Repository 구현체는 조립 지점(AssessmentRepositoryProvider)에서만 참조합니다.",
    },
  ],
};

/**
 * 브라우저 전역 금지 (docs/AGENTS.md 2.1)
 * Domain은 서버에서도 실행될 수 있어야 합니다.
 */
const restrictedBrowserGlobals = [
  { name: "window", message: "Domain은 브라우저 전역에 의존할 수 없습니다." },
  { name: "document", message: "Domain은 브라우저 전역에 의존할 수 없습니다." },
  { name: "localStorage", message: "저장은 Repository port를 통해서만 합니다." },
  { name: "sessionStorage", message: "저장은 Repository port를 통해서만 합니다." },
  { name: "indexedDB", message: "저장은 Repository port를 통해서만 합니다." },
];

/**
 * 비결정성 금지 (docs/AGENTS.md 1.x 규칙 5, DEC-032)
 * 채점은 순수 함수이고, Application은 Clock / IdGenerator port를 주입받습니다.
 */
const restrictedNonDeterministicProperties = [
  {
    object: "Math",
    property: "random",
    message: "같은 입력이 항상 같은 결과를 내야 합니다. IdGenerator port를 주입받으세요.",
  },
  {
    object: "Date",
    property: "now",
    message: "같은 입력이 항상 같은 결과를 내야 합니다. Clock port를 주입받으세요.",
  },
];

const restrictedNonDeterministicSyntax = [
  {
    selector: "NewExpression[callee.name='Date']",
    message: "같은 입력이 항상 같은 결과를 내야 합니다. Clock port를 주입받으세요.",
  },
  {
    selector: "MemberExpression[object.object.name='crypto'][object.property.name='randomUUID']",
    message: "IdGenerator port를 주입받으세요.",
  },
  {
    selector: "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']",
    message: "IdGenerator port를 주입받으세요.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),

  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", domainRestrictedImports],
      "no-restricted-globals": ["error", ...restrictedBrowserGlobals],
      "no-restricted-properties": ["error", ...restrictedNonDeterministicProperties],
      "no-restricted-syntax": ["error", ...restrictedNonDeterministicSyntax],
    },
  },

  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", applicationRestrictedImports],
      "no-restricted-globals": ["error", ...restrictedBrowserGlobals],
      "no-restricted-properties": ["error", ...restrictedNonDeterministicProperties],
      "no-restricted-syntax": ["error", ...restrictedNonDeterministicSyntax],
    },
  },

  {
    files: ["src/features/**/*.ts", "src/features/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", featuresRestrictedImports],
    },
  },

  // 조립 지점(Composition Root)만 예외입니다.
  // 저장소 구현체를 고르는 파일은 이 하나뿐이어야 합니다 (docs/architecture.md 2장).
  {
    files: ["src/features/shared/AssessmentRepositoryProvider.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // 테스트는 계층을 조립하는 자리입니다.
  // (예: application 테스트가 InMemoryAssessmentRepository를 끼워 넣습니다)
  {
    files: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
