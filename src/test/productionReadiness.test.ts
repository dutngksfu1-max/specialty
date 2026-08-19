import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "@/lib/errorMessages";
import { SITE_URL } from "@/lib/siteCopy";
import { StaticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

/**
 * 배포 준비 가드 (Phase 6, PRD AC-7)
 *
 * 배포 직전에 조용히 무너지기 쉬운 것들을 여기서 잡습니다.
 * 실제 배포 확인(실기기·링크 미리보기)은 사람이 해야 하지만,
 * **한 번 맞춰 둔 것이 나중에 어긋나는 일**은 여기서 막습니다.
 */

const SRC = join(process.cwd(), "src");

function collectFiles(dir: string, extensions: readonly string[]): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectFiles(full, extensions));
      continue;
    }
    if (extensions.some((extension) => entry.endsWith(extension))) found.push(full);
  }
  return found;
}

describe("배포 주소 (DEC-022)", () => {
  it("절대 URL이고 https입니다", () => {
    expect(() => new URL(SITE_URL)).not.toThrow();
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });

  it("주소 끝에 슬래시가 없습니다 (붙이면 //로 이어집니다)", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("주소에 금지된 표현이 없습니다 (AGENTS.md 1.1)", () => {
    expect(SITE_URL).not.toMatch(new RegExp(["m", "b", "t", "i"].join(""), "i"));
    expect(SITE_URL).not.toMatch(/\b[EI][NS][TF][JP]\b/i);
  });
});

describe("검색엔진 안내", () => {
  it("진행·결과 화면은 색인하지 않습니다 (개인 응답에서 나온 화면)", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules.flatMap((rule) => rule.disallow ?? []) : (rules.disallow ?? []);
    const list = Array.isArray(disallow) ? disallow : [disallow];

    expect(list.some((path) => path.includes("/run"))).toBe(true);
    expect(list.some((path) => path.includes("/result"))).toBe(true);
  });

  it("sitemap이 카탈로그에서 검사 목록을 읽습니다 (손으로 적지 않음)", () => {
    const published = new StaticAssessmentCatalog().listPublished();
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(SITE_URL);
    for (const definition of published) {
      expect(urls).toContain(`${SITE_URL}/assessments/${definition.slug}`);
    }
    // 개인 화면은 sitemap에 없어야 합니다.
    expect(urls.some((url) => url.includes("/run") || url.includes("/result"))).toBe(false);
  });

  it("sitemap 주소가 전부 유효한 절대 URL입니다", () => {
    for (const entry of sitemap()) {
      expect(() => new URL(entry.url)).not.toThrow();
    }
  });
});

describe("오류 처리 (AC-7)", () => {
  it("모든 오류 코드에 사람이 읽을 수 있는 문구가 있습니다", () => {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message.title.length, code).toBeGreaterThan(0);
      expect(message.body.length, code).toBeGreaterThan(0);
      // 기술 용어가 그대로 새어 나오면 안 됩니다.
      expect(`${message.title} ${message.body}`, code).not.toMatch(
        /undefined|null|Error|Exception|stack|IndexedDB/i,
      );
    }
  });

  it("되돌아갈 길이 필요한 오류에는 행동 버튼이 있습니다", () => {
    for (const code of [
      "ASSESSMENT_NOT_FOUND",
      "VERSION_MISMATCH",
      "SESSION_NOT_FOUND",
      "DRAFT_CORRUPTED",
    ] as const) {
      expect(ERROR_MESSAGES[code].action, code).toBeDefined();
    }
  });

  it("UI가 error.detail을 화면에 그리지 않습니다", () => {
    const uiFiles = collectFiles(SRC, [".tsx"]).filter((file) => !file.includes(".test."));
    for (const file of uiFiles) {
      const source = readFileSync(file, "utf8");
      // JSX 안에 {...detail}을 넣는 패턴을 막습니다.
      expect(source, file).not.toMatch(/\{[^}]*\berror\.detail\b[^}]*\}/);
    }
  });
});

describe("성능 (Phase 6)", () => {
  /**
   * `public/`에 둔 파일은 그대로 서빙되고 Service Worker가 프리캐시합니다.
   * 폰트 원본(2MB)을 거기 두면, 실제로 쓰이는 파일은 next/font가 만드는
   * `/_next/static/media/...` 쪽인데도 **쓰지 않는 사본을 2MB 더 받게** 됩니다.
   * 실제로 이것 때문에 프리캐시가 3094KiB → 1085KiB로 줄었습니다.
   */
  it("public/에 큰 폰트 파일을 두지 않습니다", () => {
    const publicDir = join(process.cwd(), "public");
    for (const file of collectFiles(publicDir, [".woff", ".woff2", ".ttf", ".otf"])) {
      const sizeKb = statSync(file).size / 1024;
      expect(sizeKb, `${file}가 public/에 있습니다 (${Math.round(sizeKb)}KB)`).toBeLessThan(100);
    }
  });

  it("폰트 원본이 빌드 입력 위치에 있습니다", () => {
    const source = readFileSync(join(SRC, "app", "fonts.ts"), "utf8");
    expect(source).toMatch(/assets\/fonts\//);
    expect(source).not.toMatch(/public\/fonts\/[^"']*\.woff2/);
  });
});

describe("링크 미리보기", () => {
  it("openGraph 이미지가 존재합니다", () => {
    const files = readdirSync(join(SRC, "app"));
    expect(files.some((file) => file.startsWith("opengraph-image"))).toBe(true);
  });

  it("layout에 metadataBase가 있습니다 (없으면 OG 이미지가 상대 경로로 나갑니다)", () => {
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(layout).toMatch(/metadataBase/);
  });
});
