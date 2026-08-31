import { getFontEmbedCSS, toPng } from "html-to-image";

/**
 * 화면에 보이는 그대로 PNG로 캡처합니다 (DEC-058 · DEC-066)
 *
 * **왜 이 파일이 따로 있나**
 *
 * PNG 저장과 PDF 저장이 각각 캡처 코드를 들고 있었습니다. 옵션이 조금씩 달랐고,
 * 폰트 캐시도 둘로 나뉘어 있었습니다. 한쪽만 고치면 다른 쪽은 계속 깨집니다.
 *
 * **글자가 두 줄로 늘어나고 판을 벗어나던 원인** (DEC-066)
 *
 * `html-to-image`는 요소마다 계산된 스타일을 인라인으로 베껴 넣고, 그 사본을
 * SVG `<foreignObject>` 안에서 **브라우저에게 다시 배치시킵니다.** 여기서 두 가지가 겹쳤습니다.
 *
 *   1. 베껴 넣는 `width`는 **글자가 실제로 차지한 만큼**입니다. 여유가 0입니다.
 *      「나를 상징하는 캐릭터」 알약은 화면에서 정확히 150.06px이었고 사본도 150.06px을 받습니다.
 *   2. `height`도 함께 못 박습니다. 화면에서 한 줄이었으니 한 줄 높이입니다.
 *
 * 그런데 SVG 그림 안에서의 글자 재기는 문서 안에서의 재기와 **소수점까지 같지 않습니다.**
 * 0.1px이라도 더 필요하면 여유가 0이므로 줄이 나뉘고, 높이는 이미 한 줄로 못 박혀 있어
 * 늘어난 줄이 **판 밖으로 흘러나와** 아래 글자와 겹칩니다.
 * 저장본에서 「나를 상징하는 캐릭터」·「나의 교직 리듬」·`G 교류형 A 실제형 …`·
 * 밸런스 지도 범례가 한꺼번에 무너진 이유가 이것입니다.
 *
 * **그래서 크기는 우리가 정합니다**
 *
 * 화면 밖 무대(stage)에 사본을 세워 **문서의 진짜 CSS로 한 번 배치시킨 뒤**, 요소를 둘로 나눕니다.
 *
 * | 어떤 상자 | 어떻게 | 왜 |
 * |---|---|---|
 * | 글자가 든 상자 | 폭·높이를 못 박지 않고 `min-height`만 남깁니다 | 줄이 하나 늘어도 상자가 **같이 자랍니다.** 글자가 판을 벗어날 수 없습니다 |
 * | 글자가 없는 상자 | 폭·높이를 화면 값 그대로 못 박습니다 | 막대·점·그림처럼 크기가 곧 의미인 것은 화면 값을 지켜야 합니다 |
 *
 * 폭을 놓아 주면 「나를 상징하는 캐릭터」처럼 **제 글자 길이로 크기가 정해지던 상자**는
 * 저장본 안에서 자기 글자에 맞춰 다시 재므로 애초에 줄이 나뉘지 않습니다.
 * 나머지 배치 규칙(`display`·`grid-template-columns`·`padding`·`max-width`…)은
 * 그대로 베껴지므로 단이 흐트러지지 않습니다.
 */

/**
 * 글꼴을 그림 안에 심는 CSS입니다. 파일이 크므로 한 번만 만들고 두 저장 기능이 함께 씁니다.
 * 첫 저장이 몇 초 걸리고, 두 번째부터는 즉시 끝납니다.
 */
let cachedFontEmbedCss: string | null = null;

/** 캡처 배율. 고해상도 화면에서도 글자가 뭉개지지 않게 합니다. */
const PIXEL_RATIO = 2;

/**
 * `html-to-image`에게 맡기지 않고 **우리가 직접 정하는** 속성입니다.
 *
 * - `width` / `height`(와 논리 속성): 위 설명대로 상자를 가두지 않기 위해서입니다
 * - `font-size`: `html-to-image`는 베낄 때 `내림(값) - 0.1px`로 **글자를 몰래 줄입니다.**
 *   13px은 12.9px(-0.8%), 12.8px은 11.9px(-7%)이 되어 크기 위계가 화면과 어긋납니다.
 *   목록에서 빼 두면 우리가 넣어 둔 정확한 값이 그대로 남습니다.
 */
const SELF_MANAGED_PROPERTIES = new Set([
  "width",
  "height",
  "inline-size",
  "block-size",
  "font-size",
]);

/** 안을 들여다보지 않고 통째로 크기를 못 박는 요소입니다. 안에서 줄이 나뉠 일이 없습니다. */
const OPAQUE_TAGS = new Set(["SVG", "IMG", "CANVAS", "VIDEO", "IFRAME", "PICTURE"]);

let cachedStyleProperties: string[] | null = null;

/**
 * `html-to-image`가 사본에 베낄 속성 목록입니다.
 *
 * 넘기지 않으면 라이브러리가 전체 목록을 쓰면서 위 다섯 가지까지 건드립니다.
 * (라이브러리 안에서 한 번 캐시되므로 매번 같은 목록을 넘겨야 합니다)
 */
function styleProperties(): string[] {
  if (cachedStyleProperties === null) {
    cachedStyleProperties = Array.from(
      window.getComputedStyle(document.documentElement),
    ).filter((name) => !SELF_MANAGED_PROPERTIES.has(name));
  }
  return cachedStyleProperties;
}

async function ensureFontEmbedCss(node: HTMLElement): Promise<string> {
  if (cachedFontEmbedCss === null) {
    cachedFontEmbedCss = await getFontEmbedCSS(node, { preferredFontFormat: "woff2" });
  }
  return cachedFontEmbedCss;
}

/**
 * 화면 밖에 사본을 세워 둘 무대를 만듭니다.
 *
 * `display: none`이 아니라 화면 밖(`left: -100000px`)입니다. 감추면 크기가 0이 되어
 * 잴 수가 없습니다. 폭을 원본과 같게 잡아야 **지금 이 기기에서 보이는 그대로** 배치됩니다 —
 * 노트북에서 저장하면 노트북 화면이, 스마트폰에서 저장하면 스마트폰 화면이 나옵니다.
 *
 * **무대를 원본 바로 옆에 세우는 이유**
 *
 * `<body>`에 붙이면 안 됩니다. 색 토큰이 `.assessment-theme` 같은 **조상에서 다시 정의**되기
 * 때문입니다(`--color-surface`는 검사 화면 안에서만 따뜻한 상아색이고 밖에서는 흰색입니다).
 * 무대를 조상 밖에 두면 그 재정의가 닿지 않아 카드 배경이 통째로 흰색으로 찍힙니다.
 * 원본의 부모에 붙이면 물려받는 값도, 조상을 타는 선택자도 원본과 똑같이 걸립니다.
 *
 * `position: fixed`라 흐름에서 빠지므로 옆에 세워도 실제 화면은 흔들리지 않습니다.
 */
function createStage(node: HTMLElement, width: number): HTMLElement {
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.setAttribute("data-capture-stage", "true");
  stage.style.position = "fixed";
  stage.style.top = "0";
  stage.style.left = "-100000px";
  stage.style.width = `${width}px`;
  stage.style.pointerEvents = "none";
  (node.parentElement ?? document.body).appendChild(stage);
  return stage;
}

/**
 * `Node.TEXT_NODE` · `Node.ELEMENT_NODE`의 값입니다.
 *
 * 전역 `Node`를 참조하지 않는 이유: 이 파일은 브라우저 밖(테스트)에서도 불러올 수 있어야 합니다.
 */
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** 공백만 있는 텍스트는 글자로 치지 않습니다. 줄바꿈용 들여쓰기까지 세면 전부 글자 상자가 됩니다. */
function hasMeaningfulText(node: Node): boolean {
  return (node.nodeValue ?? "").trim().length > 0;
}

interface Measured {
  readonly element: HTMLElement;
  readonly width: number;
  readonly height: number;
  readonly fontSize: string;
  /** 이 요소 **또는 그 안쪽 어딘가에** 글자가 있는가 */
  readonly holdsText: boolean;
  /** 화면에서 글자가 딱 한 줄인가 */
  readonly singleLine: boolean;
}

/**
 * 화면에서 이 요소의 글자가 몇 줄을 차지하는지 셉니다.
 *
 * 줄 상자마다 위치(`top`)가 다르므로, 서로 다른 `top`의 개수가 곧 줄 수입니다.
 * 안에 블록 자식이 있으면 자연히 여러 값이 나와 "한 줄"로 세어지지 않습니다 — 의도한 대로입니다.
 */
function countTextLines(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  const tops = new Set<number>();
  for (const rect of Array.from(range.getClientRects())) {
    if (rect.width === 0 && rect.height === 0) continue;
    tops.add(Math.round(rect.top));
  }
  range.detach();
  return tops.size;
}

/**
 * 사본을 훑으며 크기를 먼저 다 재고, 글자를 품었는지 표시합니다.
 *
 * 재기와 고치기를 한 번에 하면 안 됩니다. 앞 요소를 고치는 순간 배치가 바뀌어
 * 뒤 요소는 **이미 달라진 화면**을 재게 됩니다. 그래서 두 걸음으로 나눕니다.
 */
function measureTree(root: HTMLElement): Measured[] {
  const measured: Measured[] = [];

  function visit(element: HTMLElement): boolean {
    const opaque = OPAQUE_TAGS.has(element.tagName.toUpperCase());
    let holdsText = false;

    if (!opaque) {
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === TEXT_NODE) {
          if (hasMeaningfulText(child)) holdsText = true;
          continue;
        }
        if (child.nodeType !== ELEMENT_NODE) continue;
        // 자식이 글자를 품었으면 부모도 글자 상자입니다. 그래야 부모가 함께 자랍니다.
        if (visit(child as HTMLElement)) holdsText = true;
      }
    }

    const rect = element.getBoundingClientRect();
    measured.push({
      element,
      width: rect.width,
      height: rect.height,
      fontSize: window.getComputedStyle(element).fontSize,
      holdsText,
      singleLine: holdsText && countTextLines(element) === 1,
    });
    return holdsText;
  }

  visit(root);
  return measured;
}

/**
 * 잰 값을 바탕으로 사본의 크기를 확정합니다 (DEC-066).
 *
 * 글자 상자는 **가두지 않고**, 글자가 없는 상자는 **화면 값 그대로** 못 박습니다.
 */
function freezeSizes(measured: readonly Measured[]): void {
  for (const item of measured) {
    const style = item.element.style;

    // `html-to-image`의 글자 축소를 막기 위해 정확한 값을 직접 남깁니다.
    style.fontSize = item.fontSize;

    if (item.holdsText) {
      // 줄이 하나 늘어도 상자가 같이 자랍니다 — 글자가 판을 벗어나지 못합니다.
      style.height = "auto";
      // 빈 여백이 접히지 않도록 화면 높이를 바닥으로 깔아 둡니다.
      style.minHeight = `${item.height}px`;

      /*
        화면에서 한 줄인 글자는 저장본에서도 한 줄이어야 합니다.

        폭을 놓아 주는 것만으로는 부족한 자리가 있습니다. 상자가 **바깥에서 눌리기** 때문입니다.
        `grid-template-columns`의 `auto` 칸은 계산된 값이 그 칸에 든 글자 폭 그대로(예: 104.969px)라
        여유가 0이고, flex 항목은 자리가 모자라면 기본값(`flex-shrink: 1`)대로 줄어듭니다.
        「나의 교직 리듬」·「나를 상징하는 캐릭터」가 여기서 접혔습니다.

        그래서 두 겹으로 막습니다.
          · `white-space: nowrap` — 상자가 눌려도 줄이 늘지 않습니다. 접힘을 확실히 막는 쪽입니다.
          · `min-width` — 화면 폭을 바닥으로 깔아 배경까지 화면과 같은 크기로 남깁니다.
            (`min-width`는 flex 줄이기보다 세서 상자가 눌리지 않습니다)

        여러 줄 상자에는 둘 다 걸지 않습니다. 넓은 상자에 바닥을 깔면 단이 밀리고,
        여러 줄짜리에 `nowrap`을 걸면 문단이 한 줄로 터집니다.
      */
      if (item.singleLine) {
        // 화면 폭을 **소수점까지 그대로** 씁니다. 올림하거나 여유를 더하면 그 몇 px이
        // 상자마다 쌓여 가운데 정렬이 화면과 어긋납니다.
        style.minWidth = `${item.width}px`;
        style.whiteSpace = "nowrap";
      }
      // 폭 자체는 못 박지 않습니다. `max-width`·단 규격은 그대로 베껴지므로
      // 단은 유지되고, 글자 길이로 정해지던 상자만 저장본 안에서 다시 재집니다.
      continue;
    }

    // 막대·점·그림처럼 크기가 곧 의미인 것들입니다. 화면 값을 그대로 지킵니다.
    style.width = `${item.width}px`;
    style.height = `${item.height}px`;
  }
}

/** 사본 안의 그림이 원본 크기를 알기 전에 재면 배치가 흔들립니다. */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;
      try {
        await image.decode();
      } catch {
        // 못 불러온 그림 하나 때문에 저장 전체를 실패시키지 않습니다.
      }
    }),
  );
}

/**
 * 페이지를 나눠도 되는 자리를 찾기 위한 **덩어리** 하나입니다 (DEC-067).
 *
 * 좌표는 캡처한 그림의 위쪽을 0으로 본 CSS px입니다.
 */
export interface PrintBlock {
  readonly top: number;
  readonly bottom: number;
}

/**
 * 종이에 나눠 담을 때 **쪼개면 안 되는 덩어리**를 모읍니다 (DEC-067).
 *
 * 위에서부터 훑어 내려가다가, 한 페이지에 들어갈 만큼 작아지면 거기서 멈추고
 * 그 요소를 덩어리 하나로 봅니다. 카드 한 장·문단 하나가 여기에 걸립니다.
 * 한 페이지보다 큰 것(장 전체 등)은 더 들어가 봅니다 — 안 그러면 나눌 자리가 없어집니다.
 *
 * 이렇게 모은 덩어리 **사이의 빈 곳**만 페이지 경계로 씁니다. 그래서 카드가
 * 반으로 잘리거나 글줄 한가운데가 끊기지 않습니다.
 */
function collectPrintBlocks(root: HTMLElement, maxBlockHeight: number): PrintBlock[] {
  const rootTop = root.getBoundingClientRect().top;
  const blocks: PrintBlock[] = [];

  function visit(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0) return;

    if (rect.height <= maxBlockHeight) {
      blocks.push({ top: rect.top - rootTop, bottom: rect.bottom - rootTop });
      return;
    }

    // 한 페이지보다 큽니다. 안으로 들어가 더 작은 덩어리를 찾습니다.
    const children = Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    if (children.length === 0) return;
    for (const child of children) visit(child);
  }

  visit(root);
  return blocks;
}

/** 캡처 결과와, 그 그림을 종이에 나눠 담을 때 쓸 정보입니다 (DEC-067). */
export interface CapturedNode {
  readonly dataUrl: string;
  /** 그림의 CSS px 크기 (실제 픽셀은 여기에 배율이 곱해집니다) */
  readonly width: number;
  readonly height: number;
  /** 쪼개면 안 되는 덩어리들. 비어 있으면 아무 데서나 잘라도 됩니다 */
  readonly blocks: readonly PrintBlock[];
}

/**
 * 노드를 화면에 보이는 그대로 캡처합니다.
 *
 * `maxBlockHeight`를 주면 종이에 나눠 담을 때 쓸 덩어리 정보도 함께 돌려줍니다 (DEC-067).
 *
 * 실패는 예외로 올라갑니다. 부르는 쪽이 사용자에게 보여 줄 문구를 정합니다.
 */
export async function captureNode(
  node: HTMLElement,
  { maxBlockHeight }: { readonly maxBlockHeight?: number } = {},
): Promise<CapturedNode> {
  // ① 글꼴이 준비되기 전에 재면 화면과 다른 폭으로 줄이 나뉩니다.
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const fontEmbedCSS = await ensureFontEmbedCss(node);

  // ② 지금 화면에서 차지하고 있는 폭을 무대 폭으로 삼습니다.
  //    소수점을 올림하지 않으면 마지막 줄이 1px 잘려 글자가 깎여 보입니다.
  const stageWidth = Math.ceil(node.getBoundingClientRect().width);
  const stage = createStage(node, stageWidth);

  try {
    const clone = node.cloneNode(true) as HTMLElement;
    // 접힌 탭 안에 있던 노드도 무대 위에서는 펼쳐 놓고 잽니다 (DEC-062).
    clone.hidden = false;
    stage.appendChild(clone);

    await waitForImages(clone);

    // ③ 문서의 진짜 CSS로 한 번 배치시킨 뒤, 잰 값으로 크기를 확정합니다.
    freezeSizes(measureTree(clone));

    const frozen = clone.getBoundingClientRect();
    const width = Math.ceil(frozen.width);
    const height = Math.ceil(frozen.height);

    // ④ 크기를 확정한 **뒤에** 덩어리를 잽니다. 확정 전에 재면 종이 위 위치와 어긋납니다.
    const blocks =
      maxBlockHeight === undefined ? [] : collectPrintBlocks(clone, maxBlockHeight);

    const options = {
      pixelRatio: PIXEL_RATIO,
      cacheBust: false,
      fontEmbedCSS,
      preferredFontFormat: "woff2" as const,
      width,
      height,
      includeStyleProperties: styleProperties(),
      backgroundColor: window.getComputedStyle(node).backgroundColor || "#ffffff",
      style: { width: `${width}px`, margin: "0" },
    };

    // ⑤ 첫 번째 결과는 버립니다. 이때 SVG 안의 글꼴이 실제로 물립니다.
    await toPng(clone, options);
    const dataUrl = await toPng(clone, options);
    return { dataUrl, width, height, blocks };
  } finally {
    stage.remove();
  }
}

/** 그림만 필요할 때 쓰는 짧은 이름입니다 (PNG 저장). */
export async function captureNodeAsPng(node: HTMLElement): Promise<string> {
  return (await captureNode(node)).dataUrl;
}

/**
 * 캡처할 노드가 숨은 조상 안에 있으면 잠깐 펼칩니다 (DEC-062).
 *
 * 결과 본문은 `요약 보기 / 자세히 보기` 탭 패널 안에 있고, 고르지 않은 패널에는
 * `hidden` 속성이 붙습니다. `hidden`은 `display: none`이라 크기가 0이 되고,
 * 그대로 캡처하면 **빈 페이지가 담긴 PDF**가 나옵니다.
 *
 * 캡처 자체는 화면 밖 무대에서 이뤄지지만(DEC-066), 무대에 세울 사본을 뜨기 전에
 * 원본이 **한 번은 배치되어 있어야** 안쪽 그림·글꼴 상태가 제대로 잡힙니다.
 * 돌려주는 함수를 반드시 `finally`에서 부르세요.
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
