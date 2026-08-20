import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 접근성 회귀 방지 (PRD AC-4, docs/design.md 15장)
 *
 * 화면을 실제로 띄워 보는 검사는 브라우저에서 사람이 해야 합니다.
 * 여기서는 **한 번 지킨 것이 나중에 조용히 무너지는 일**만 막습니다.
 * 소스를 읽어 "절대 하면 안 되는 것"이 들어왔는지 확인합니다.
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

const uiFiles = collectFiles(SRC, [".tsx"]).filter((file) => !file.endsWith(".test.tsx"));

function read(relativePath: string): string {
  return readFileSync(join(SRC, relativePath), "utf-8");
}

describe("focus 표시를 지우지 않습니다", () => {
  it("outline을 없애는 코드가 없습니다", () => {
    for (const file of uiFiles) {
      const source = readFileSync(file, "utf-8");
      expect(source, file).not.toMatch(/outline-none|outline:\s*none/);
      expect(source, file).not.toMatch(/focus:outline-none/);
    }
  });

  it("globals.css가 focus-visible 스타일을 제공합니다", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/:focus-visible\s*\{/);
    expect(css).toContain("--color-focus-ring");
  });
});

describe("척도는 진짜 라디오여야 합니다 (design.md 10.2)", () => {
  const likert = read("features/assessment-runner/LikertScale.tsx");
  const questionCard = read("features/assessment-runner/QuestionCard.tsx");

  it("네이티브 input[type=radio]를 씁니다", () => {
    expect(likert).toContain('type="radio"');
    // div + onClick으로 흉내 내면 화살표 키 이동과 스크린리더 안내가 사라집니다.
    expect(likert).not.toMatch(/role="radio"/);
  });

  it("radiogroup과 문항 텍스트가 연결되어 있습니다", () => {
    expect(questionCard).toContain("<fieldset");
    expect(questionCard).toContain('role="radiogroup"');
    expect(questionCard).toContain("<legend");
  });

  it("선택지마다 input과 label을 명시적으로 연결합니다", () => {
    expect(likert).toContain("htmlFor={id}");
    expect(likert).toContain("id={id}");
    expect(likert).toContain("option.visibleLabel ?? option.label");
  });

  it("터치 영역 44px를 유지합니다", () => {
    expect(likert).toContain("size-11");
  });
});

describe("확대와 언어 설정", () => {
  const layout = read("app/layout.tsx");

  it("html lang이 한국어입니다", () => {
    expect(layout).toContain('lang="ko"');
  });

  it("확대를 막지 않습니다 (200% 확대 지원)", () => {
    expect(layout).not.toMatch(/userScalable:\s*false/);
    expect(layout).not.toMatch(/maximumScale:\s*1\b/);
  });

  it("본문 바로가기(skip link)가 있습니다", () => {
    expect(layout).toContain('href="#main"');
    expect(layout).toContain("본문 바로가기");
  });
});

describe("움직임 설정을 존중합니다", () => {
  it("prefers-reduced-motion 블록이 있습니다", () => {
    const css = read("app/globals.css");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("스크롤 이동도 설정을 따릅니다", () => {
    const runner = read("features/assessment-runner/AssessmentRunner.tsx");
    expect(runner).toContain("prefers-reduced-motion");
  });
});

describe("상태를 색만으로 전달하지 않습니다", () => {
  it("미응답 표시에 문구가 함께 있습니다", () => {
    const card = read("features/assessment-runner/QuestionCard.tsx");
    expect(card).toContain("status-warning");
    expect(card).toContain("아직 답하지 않았어요");
  });

  it("진행률에 숫자를 함께 적습니다", () => {
    const progress = read("features/assessment-runner/AssessmentProgress.tsx");
    expect(progress).toContain('role="progressbar"');
    expect(progress).toContain("aria-valuenow");
    expect(progress).toContain("{answeredCount}");
    expect(progress).toContain("{totalCount}");
    expect(progress).toContain("aria-valuetext");
  });

  it("축 시각화를 문장으로도 읽어 줍니다", () => {
    const axisBar = read("features/result/AxisBar.tsx");
    expect(axisBar).toContain("sr-only");
  });
});

describe("오프라인 · 업데이트 안내", () => {
  it("새 버전을 자동으로 새로고침하지 않습니다 (architecture 9.5)", () => {
    const sw = readFileSync(join(SRC, "app/sw.ts"), "utf-8");
    expect(sw).toMatch(/skipWaiting:\s*false/);

    const provider = read("features/shared/ServiceWorkerProvider.tsx");
    expect(provider).toMatch(/reloadOnOnline=\{false\}/);
  });

  it("오프라인 안내 페이지로 되돌아갈 길이 있습니다", () => {
    const sw = readFileSync(join(SRC, "app/sw.ts"), "utf-8");
    expect(sw).toContain("/~offline");
  });
});
