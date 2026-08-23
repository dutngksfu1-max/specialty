import { getFontEmbedCSS, toPng } from "html-to-image";

/**
 * 화면에 보이는 그대로 PNG로 캡처합니다 (DEC-058)
 *
 * **왜 이 파일이 따로 있나**
 *
 * PNG 저장과 PDF 저장이 각각 캡처 코드를 들고 있었습니다. 옵션이 조금씩 달랐고,
 * 폰트 캐시도 둘로 나뉘어 있었습니다. 한쪽만 고치면 다른 쪽은 계속 깨집니다.
 *
 * **글자가 겹치던 원인**
 *
 * html-to-image는 DOM을 SVG `<foreignObject>` 안에 넣어 브라우저에게 다시 그리게 합니다.
 * 이때 글꼴이 아직 준비되지 않았으면 **대체 글꼴의 글자 폭으로 줄을 나눈 뒤,
 * 준비된 진짜 글꼴로 글자를 그립니다.** 배치와 그리기가 서로 다른 글꼴을 보게 되어
 * 줄이 겹치고 상자 밖으로 삐져나옵니다.
 *
 * 그래서 세 가지를 지킵니다.
 *
 *   1. `document.fonts.ready` — 문서의 글꼴이 다 준비된 뒤에 시작합니다
 *   2. **두 번 그립니다** — 첫 번째는 SVG 안에 심은 글꼴을 실제로 물리는 용도이고,
 *      쓸 결과는 두 번째입니다. html-to-image에서 널리 쓰이는 방법입니다
 *   3. **폭·높이를 못 박습니다** — 넘기지 않으면 foreignObject가 다른 폭으로 줄을 다시 나눠,
 *      화면과 다른 그림이 나옵니다
 */

/**
 * 글꼴을 그림 안에 심는 CSS입니다. 파일이 크므로 한 번만 만들고 두 저장 기능이 함께 씁니다.
 * 첫 저장이 몇 초 걸리고, 두 번째부터는 즉시 끝납니다.
 */
let cachedFontEmbedCss: string | null = null;

/** 캡처 배율. 고해상도 화면에서도 글자가 뭉개지지 않게 합니다. */
const PIXEL_RATIO = 2;

async function ensureFontEmbedCss(node: HTMLElement): Promise<string> {
  if (cachedFontEmbedCss === null) {
    cachedFontEmbedCss = await getFontEmbedCSS(node, { preferredFontFormat: "woff2" });
  }
  return cachedFontEmbedCss;
}

/**
 * 노드를 화면에 보이는 그대로 PNG data URL로 만듭니다.
 *
 * 실패는 예외로 올라갑니다. 부르는 쪽이 사용자에게 보여 줄 문구를 정합니다.
 */
export async function captureNodeAsPng(node: HTMLElement): Promise<string> {
  // ① 글꼴이 준비되기 전에 재면 화면과 다른 폭으로 줄이 나뉩니다.
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const fontEmbedCSS = await ensureFontEmbedCss(node);

  // ③ 지금 화면에서 차지하고 있는 크기를 그대로 씁니다.
  //    소수점을 올림하지 않으면 마지막 줄이 1px 잘려 글자가 깎여 보입니다.
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);

  const options = {
    pixelRatio: PIXEL_RATIO,
    cacheBust: false,
    fontEmbedCSS,
    preferredFontFormat: "woff2" as const,
    width,
    height,
    backgroundColor: window.getComputedStyle(node).backgroundColor || "#ffffff",
    // 캡처 순간에만 크기를 못 박습니다. 화면의 실제 요소는 건드리지 않습니다.
    style: { width: `${width}px`, height: `${height}px` },
  };

  // ② 첫 번째 결과는 버립니다. 이때 SVG 안의 글꼴이 실제로 물립니다.
  await toPng(node, options);
  return toPng(node, options);
}

/**
 * 캡처할 노드가 숨은 조상 안에 있으면 잠깐 펼칩니다 (DEC-062).
 *
 * 결과 본문은 `요약 보기 / 자세히 보기` 탭 패널 안에 있고, 고르지 않은 패널에는
 * `hidden` 속성이 붙습니다. `hidden`은 `display: none`이라 크기가 0이 되고,
 * 그대로 캡처하면 **빈 페이지가 담긴 PDF**가 나옵니다.
 *
 * 그래서 캡처 동안만 펼쳤다가 되돌립니다. 돌려주는 함수를 반드시 `finally`에서 부르세요.
 * `hidden` 속성만 다룹니다 — 화면 스타일은 건드리지 않으므로 되돌리기가 확실합니다.
 */
export function revealHiddenAncestors(node: HTMLElement): () => void {
  const restores: (() => void)[] = [];

  for (let current = node.parentElement; current !== null; current = current.parentElement) {
    if (!current.hidden) continue;
    const element = current;
    element.hidden = false;
    restores.push(() => {
      element.hidden = true;
    });
  }

  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

/** 파일명에 쓸 수 없는 문자를 걸러 냅니다. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned.length === 0 ? "결과" : cleaned;
}
