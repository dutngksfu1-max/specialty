import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 캡처 절차 회귀 방지 (DEC-058 · DEC-066)
 *
 * 저장본에서 글자가 두 줄로 늘어나고 판을 벗어나던 원인은 두 가지였습니다.
 *
 *   1. 글꼴이 준비되기 전에 줄을 나눔 (DEC-058)
 *   2. 상자마다 **여유 0의 폭과 한 줄짜리 높이를 못 박아**, SVG 안에서 글자가
 *      아주 조금만 넓어져도 줄이 나뉘고 늘어난 줄이 판 밖으로 흘러나옴 (DEC-066)
 *
 * 브라우저 없이 래스터 결과를 볼 수는 없으므로 **절차**를 대신 지킵니다.
 * 아래 규칙은 눈으로는 확인이 안 되고, 리팩터링 때 조용히 사라지기 쉽습니다.
 */

const mocks = vi.hoisted(() => ({
  toPng: vi.fn(),
  getFontEmbedCSS: vi.fn(),
}));

vi.mock("html-to-image", () => ({
  toPng: mocks.toPng,
  getFontEmbedCSS: mocks.getFontEmbedCSS,
}));

const TEXT_NODE = 3;

interface FakeOptions {
  readonly tag?: string;
  readonly text?: string;
  readonly width?: number;
  readonly height?: number;
  readonly fontSize?: string;
  /** 화면에서 이 요소의 글자가 차지한 줄 상자들. 줄 수를 세는 데 씁니다. */
  readonly lineTops?: readonly number[];
  readonly children?: readonly FakeElement[];
}

/**
 * 캡처 대상 노드 흉내.
 *
 * jsdom을 새로 들이지 않고(의존성 승인 대상입니다) `captureNode`가 실제로 쓰는
 * 최소한의 DOM만 흉내 냅니다 — 크기 재기, 글자 유무, 줄 수, 복제, 스타일 쓰기.
 */
class FakeElement {
  readonly tagName: string;
  readonly childNodes: { nodeType: number; nodeValue: string | null }[] = [];
  readonly style: Record<string, string> = {};
  readonly lineTops: readonly number[];
  parentElement: FakeElement | null = null;
  hidden = false;
  isStage = false;
  private readonly width: number;
  private readonly height: number;
  readonly fontSize: string;
  private readonly options: FakeOptions;

  constructor(options: FakeOptions = {}) {
    this.options = options;
    this.tagName = options.tag ?? "DIV";
    this.width = options.width ?? 100;
    this.height = options.height ?? 20;
    this.fontSize = options.fontSize ?? "16px";
    this.lineTops = options.lineTops ?? [0];

    if (options.text !== undefined) {
      this.childNodes.push({ nodeType: TEXT_NODE, nodeValue: options.text });
    }
    for (const child of options.children ?? []) {
      child.parentElement = this;
      this.childNodes.push(child as unknown as { nodeType: number; nodeValue: string | null });
    }
  }

  get children(): FakeElement[] {
    return this.childNodes.filter(
      (node) => (node as unknown as FakeElement).tagName !== undefined,
    ) as unknown as FakeElement[];
  }

  getBoundingClientRect() {
    return { width: this.width, height: this.height, top: 0, left: 0 };
  }

  cloneNode(): FakeElement {
    return new FakeElement(this.options);
  }

  appendChild(child: FakeElement) {
    child.parentElement = this;
    this.childNodes.push(child as unknown as { nodeType: number; nodeValue: string | null });
    // 무대가 어느 부모에 붙었는지 기록해 둡니다 (테마 토큰 범위 — DEC-066).
    if (child.isStage) stageParents.push(this);
    return child;
  }

  querySelectorAll(): FakeElement[] {
    return [];
  }

  remove() {
    const parent = this.parentElement;
    if (parent === null) return;
    const index = parent.childNodes.indexOf(
      this as unknown as { nodeType: number; nodeValue: string | null },
    );
    if (index >= 0) parent.childNodes.splice(index, 1);
    this.parentElement = null;
  }

  setAttribute() {}
}

/** 요소 하나를 그 부모에 담아 돌려줍니다. 무대가 부모에 붙는지 확인하려면 부모가 필요합니다. */
function nodeWithParent(options: FakeOptions = {}): {
  node: FakeElement;
  parent: FakeElement;
} {
  const node = new FakeElement(options);
  const parent = new FakeElement({ tag: "SECTION" });
  node.parentElement = parent;
  return { node, parent };
}

/** 캡처가 만든 사본(무대 위 첫 자식)을 꺼냅니다. */
function capturedClone(parent: FakeElement): FakeElement {
  const stage = createdStages.at(-1);
  if (stage === undefined) throw new Error("무대가 만들어지지 않았습니다.");
  expect(stageParents.at(-1)).toBe(parent);
  const clone = stage.children[0];
  if (clone === undefined) throw new Error("사본이 무대에 올라가지 않았습니다.");
  return clone;
}

let fontsReadyResolved: boolean;
let createdStages: FakeElement[];
let stageParents: (FakeElement | null)[];

/** `<html>`의 계산된 스타일을 훑어 만드는 속성 목록 흉내 */
const ALL_PROPERTIES = [
  "background-color",
  "block-size",
  "display",
  "font-size",
  "height",
  "inline-size",
  "min-height",
  "min-width",
  "white-space",
  "width",
];

beforeEach(() => {
  vi.resetModules();
  mocks.toPng.mockReset();
  mocks.getFontEmbedCSS.mockReset();

  fontsReadyResolved = false;
  createdStages = [];
  stageParents = [];
  mocks.getFontEmbedCSS.mockResolvedValue("@font-face{font-family:test}");
  // 호출 순서를 구분할 수 있게 두 번의 반환값을 다르게 둡니다.
  mocks.toPng
    .mockResolvedValueOnce("data:image/png;base64,FIRST")
    .mockResolvedValueOnce("data:image/png;base64,SECOND");

  const documentElement = new FakeElement({ tag: "HTML" });
  const body = new FakeElement({ tag: "BODY" });

  vi.stubGlobal("document", {
    documentElement,
    body,
    fonts: {
      ready: Promise.resolve().then(() => {
        fontsReadyResolved = true;
      }),
    },
    createElement: () => {
      const stage = new FakeElement({ tag: "DIV" });
      stage.isStage = true;
      createdStages.push(stage);
      return stage;
    },
    createRange: () => {
      let selected: FakeElement | null = null;
      return {
        selectNodeContents: (element: FakeElement) => {
          selected = element;
        },
        getClientRects: () =>
          (selected?.lineTops ?? []).map((top) => ({ top, width: 10, height: 10 })),
        detach: () => {},
      };
    },
  });
  vi.stubGlobal("window", {
    getComputedStyle: (element: FakeElement) => {
      const style = {
        backgroundColor: "rgb(255, 255, 255)",
        fontSize: element?.fontSize ?? "16px",
        [Symbol.iterator]: () => ALL_PROPERTIES[Symbol.iterator](),
      };
      return style as unknown as CSSStyleDeclaration;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captureNodeAsPng", () => {
  it("글꼴이 준비된 뒤에 그리기 시작합니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node } = nodeWithParent();
    await captureNodeAsPng(node as unknown as HTMLElement);

    expect(fontsReadyResolved).toBe(true);
  });

  it("두 번 그리고 두 번째 결과를 돌려줍니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node } = nodeWithParent();
    const dataUrl = await captureNodeAsPng(node as unknown as HTMLElement);

    // 첫 번째는 SVG 안의 글꼴을 물리는 용도라 버립니다.
    expect(mocks.toPng).toHaveBeenCalledTimes(2);
    expect(dataUrl).toBe("data:image/png;base64,SECOND");
  });

  it("두 번 그리는 동안 같은 옵션을 씁니다 — 배치와 그리기가 어긋나면 안 됩니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node } = nodeWithParent();
    await captureNodeAsPng(node as unknown as HTMLElement);

    const [first, second] = mocks.toPng.mock.calls;
    expect(first?.[1]).toEqual(second?.[1]);
  });

  it("글꼴 CSS는 한 번만 만들고 다시 씁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    mocks.toPng.mockResolvedValue("data:image/png;base64,ANY");

    await captureNodeAsPng(nodeWithParent().node as unknown as HTMLElement);
    await captureNodeAsPng(nodeWithParent().node as unknown as HTMLElement);

    // 파일이 커서 매번 다시 만들면 저장이 눈에 띄게 느려집니다.
    expect(mocks.getFontEmbedCSS).toHaveBeenCalledTimes(1);
  });

  it("만든 글꼴 CSS를 캡처 옵션에 실어 보냅니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(nodeWithParent().node as unknown as HTMLElement);

    const options = mocks.toPng.mock.calls[0]?.[1] as { fontEmbedCSS: string };
    expect(options.fontEmbedCSS).toBe("@font-face{font-family:test}");
  });

  it("화면에서 차지한 폭을 올림해 못 박아 넘깁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node } = nodeWithParent({ width: 800.4, height: 1200.2 });
    await captureNodeAsPng(node as unknown as HTMLElement);

    for (const call of mocks.toPng.mock.calls) {
      const options = call[1] as { width: number; height: number; style: Record<string, string> };
      // 내림하면 마지막 줄이 1px 잘려 글자가 깎입니다.
      expect(options.width).toBe(801);
      expect(options.height).toBe(1201);
      expect(options.style.width).toBe("801px");
    }
  });
});

/**
 * 상자를 가두지 않기 (DEC-066)
 *
 * 이 네 가지가 무너지면 저장본에서 다시 글자가 두 줄이 되고 판을 벗어납니다.
 */
describe("사본의 크기를 정하는 규칙 (DEC-066)", () => {
  it("글자가 든 상자는 높이를 못 박지 않고 바닥만 깔아 둡니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node, parent } = nodeWithParent({
      text: "글자가 있는 상자",
      width: 200,
      height: 40,
      // 두 줄이라 한 줄 보호 규칙에는 걸리지 않습니다.
      lineTops: [0, 20],
    });
    await captureNodeAsPng(node as unknown as HTMLElement);

    const clone = capturedClone(parent);
    // 줄이 하나 늘어도 상자가 같이 자라야 합니다.
    expect(clone.style.height).toBe("auto");
    expect(clone.style.minHeight).toBe("40px");
    // 폭을 못 박으면 여유가 0이 되어 줄이 나뉩니다.
    expect(clone.style.width).toBeUndefined();
  });

  it("한 줄짜리 글자 상자는 폭 바닥과 줄바꿈 금지를 함께 겁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node, parent } = nodeWithParent({
      text: "나를 상징하는 캐릭터",
      width: 150.0625,
      height: 31.59,
      lineTops: [0],
    });
    await captureNodeAsPng(node as unknown as HTMLElement);

    const clone = capturedClone(parent);
    // 올림하거나 여유를 더하면 그 몇 px이 상자마다 쌓여 가운데 정렬이 어긋납니다.
    expect(clone.style.minWidth).toBe("150.0625px");
    expect(clone.style.whiteSpace).toBe("nowrap");
  });

  it("글자가 없는 상자는 화면 크기를 그대로 못 박습니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    // 막대·점처럼 크기가 곧 의미인 것들입니다.
    const { node, parent } = nodeWithParent({ width: 64, height: 8, lineTops: [] });
    await captureNodeAsPng(node as unknown as HTMLElement);

    const clone = capturedClone(parent);
    expect(clone.style.width).toBe("64px");
    expect(clone.style.height).toBe("8px");
    expect(clone.style.minHeight).toBeUndefined();
  });

  it("글자 크기를 깎지 않고 화면 값 그대로 남깁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    // html-to-image는 베낄 때 `내림(값) - 0.1px`로 글자를 줄입니다. 그대로 두면 위계가 어긋납니다.
    const { node, parent } = nodeWithParent({ text: "글자", fontSize: "12.8px" });
    await captureNodeAsPng(node as unknown as HTMLElement);

    expect(capturedClone(parent).style.fontSize).toBe("12.8px");
  });

  it("크기 속성은 html-to-image에 맡기지 않습니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(nodeWithParent().node as unknown as HTMLElement);

    const options = mocks.toPng.mock.calls[0]?.[1] as { includeStyleProperties: string[] };
    for (const name of ["width", "height", "inline-size", "block-size", "font-size"]) {
      expect(options.includeStyleProperties).not.toContain(name);
    }
    // 나머지는 그대로 베껴야 배치와 색이 화면과 같습니다.
    expect(options.includeStyleProperties).toContain("display");
    expect(options.includeStyleProperties).toContain("background-color");
  });
});

/**
 * 무대를 세우는 자리 (DEC-066)
 *
 * 색 토큰이 `.assessment-theme` 조상에서 다시 정의되므로, 무대를 조상 밖에 두면
 * 카드 배경이 통째로 흰색으로 찍힙니다.
 */
describe("캡처 무대", () => {
  it("원본의 부모에 세웁니다 — 조상이 정의한 색 토큰을 그대로 물려받아야 합니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node, parent } = nodeWithParent();
    await captureNodeAsPng(node as unknown as HTMLElement);

    expect(stageParents).toEqual([parent]);
  });

  it("캡처가 끝나면 무대를 걷어 냅니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const { node, parent } = nodeWithParent();
    await captureNodeAsPng(node as unknown as HTMLElement);

    expect(parent.children).toHaveLength(0);
  });

  it("캡처가 실패해도 무대를 걷어 냅니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    mocks.toPng.mockReset();
    mocks.toPng.mockRejectedValue(new Error("boom"));
    const { node, parent } = nodeWithParent();

    await expect(captureNodeAsPng(node as unknown as HTMLElement)).rejects.toThrow("boom");
    // 남겨 두면 화면 밖에 사본이 계속 쌓입니다.
    expect(parent.children).toHaveLength(0);
  });
});

describe("safeFileName", () => {
  it("파일명에 쓸 수 없는 문자를 걸러 냅니다", async () => {
    const { safeFileName } = await import("@/features/result/captureNode");

    expect(safeFileName('김/선생:님*?"<>|')).toBe("김선생님");
  });

  it("남는 글자가 없으면 기본 이름을 씁니다", async () => {
    const { safeFileName } = await import("@/features/result/captureNode");

    expect(safeFileName("///")).toBe("결과");
    expect(safeFileName("   ")).toBe("결과");
  });
});


/**
 * 숨은 탭 패널 안의 본문 캡처 (DEC-062)
 *
 * 결과 본문은 `자세히 보기` 패널 안에 있고, 고르지 않은 패널에는 `hidden`이 붙습니다.
 * 펼치지 않고 캡처하면 크기가 0이라 **빈 페이지가 담긴 PDF**가 나옵니다.
 * 무대도 원본의 부모에 붙으므로(DEC-066) 조상이 숨어 있으면 무대까지 크기가 0이 됩니다.
 * 브라우저 없이 확인할 수 없는 대신, 펼치고 되돌리는 절차를 여기서 지킵니다.
 */
describe("revealHiddenAncestors", () => {
  /** parentElement 사슬만 흉내 냅니다. 실제 DOM 없이 절차만 확인합니다. */
  function chain(hiddenFlags: readonly boolean[]) {
    const nodes = hiddenFlags.map((hidden) => ({ hidden, parentElement: null }) as unknown as HTMLElement);
    for (let i = 0; i < nodes.length - 1; i += 1) {
      Object.defineProperty(nodes[i] as object, "parentElement", {
        value: nodes[i + 1],
        writable: true,
      });
    }
    return nodes;
  }

  it("숨은 조상을 펼치고, 되돌리면 원래대로 돌아옵니다", async () => {
    const { revealHiddenAncestors } = await import("@/features/result/captureNode");
    const [target, panel, page] = chain([false, true, false]);
    if (target === undefined || panel === undefined || page === undefined) {
      throw new Error("테스트 노드를 만들지 못했습니다.");
    }

    const restore = revealHiddenAncestors(target);
    expect(panel.hidden).toBe(false);

    restore();
    expect(panel.hidden).toBe(true);
    expect(page.hidden).toBe(false);
  });

  it("숨은 조상이 없으면 아무것도 건드리지 않습니다", async () => {
    const { revealHiddenAncestors } = await import("@/features/result/captureNode");
    const [target, parent] = chain([false, false]);
    if (target === undefined || parent === undefined) {
      throw new Error("테스트 노드를 만들지 못했습니다.");
    }

    revealHiddenAncestors(target)();
    expect(parent.hidden).toBe(false);
  });

  it("캡처 대상 자신은 건드리지 않습니다 — 조상만 봅니다", async () => {
    const { revealHiddenAncestors } = await import("@/features/result/captureNode");
    const [target] = chain([true]);
    if (target === undefined) throw new Error("테스트 노드를 만들지 못했습니다.");

    revealHiddenAncestors(target);
    expect(target.hidden).toBe(true);
  });
});
