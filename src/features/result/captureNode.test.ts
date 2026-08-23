import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 캡처 절차 회귀 방지 (DEC-058)
 *
 * 글자가 겹치던 원인은 **글꼴이 준비되기 전에 줄을 나눈 것**이었습니다.
 * 아래 세 가지는 눈으로는 확인이 안 되고, 리팩터링 때 조용히 사라지기 쉽습니다.
 *
 *   1. `document.fonts.ready`를 기다린다
 *   2. 두 번 그리고 **두 번째**를 쓴다
 *   3. 화면에서 차지한 폭·높이를 못 박아 넘긴다
 *
 * 브라우저 없이 래스터 결과를 볼 수는 없으므로, 절차가 지켜지는지를 대신 지킵니다.
 */

const mocks = vi.hoisted(() => ({
  toPng: vi.fn(),
  getFontEmbedCSS: vi.fn(),
}));

vi.mock("html-to-image", () => ({
  toPng: mocks.toPng,
  getFontEmbedCSS: mocks.getFontEmbedCSS,
}));

/** 캡처 대상 노드 흉내. 소수점 크기를 줘서 올림 처리까지 확인합니다. */
function fakeNode(width = 800.4, height = 1200.2): HTMLElement {
  return {
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as HTMLElement;
}

let fontsReadyResolved: boolean;

beforeEach(() => {
  vi.resetModules();
  mocks.toPng.mockReset();
  mocks.getFontEmbedCSS.mockReset();

  fontsReadyResolved = false;
  mocks.getFontEmbedCSS.mockResolvedValue("@font-face{font-family:test}");
  // 호출 순서를 구분할 수 있게 두 번의 반환값을 다르게 둡니다.
  mocks.toPng
    .mockResolvedValueOnce("data:image/png;base64,FIRST")
    .mockResolvedValueOnce("data:image/png;base64,SECOND");

  vi.stubGlobal("document", {
    fonts: {
      ready: Promise.resolve().then(() => {
        fontsReadyResolved = true;
      }),
    },
  });
  vi.stubGlobal("window", {
    getComputedStyle: () => ({ backgroundColor: "rgb(255, 255, 255)" }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captureNodeAsPng", () => {
  it("글꼴이 준비된 뒤에 그리기 시작합니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(fakeNode());

    expect(fontsReadyResolved).toBe(true);
  });

  it("두 번 그리고 두 번째 결과를 돌려줍니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    const dataUrl = await captureNodeAsPng(fakeNode());

    // 첫 번째는 SVG 안의 글꼴을 물리는 용도라 버립니다.
    expect(mocks.toPng).toHaveBeenCalledTimes(2);
    expect(dataUrl).toBe("data:image/png;base64,SECOND");
  });

  it("화면에서 차지한 크기를 올림해 못 박아 넘깁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(fakeNode(800.4, 1200.2));

    for (const call of mocks.toPng.mock.calls) {
      const options = call[1] as { width: number; height: number; style: Record<string, string> };
      // 내림하면 마지막 줄이 1px 잘려 글자가 깎입니다.
      expect(options.width).toBe(801);
      expect(options.height).toBe(1201);
      expect(options.style.width).toBe("801px");
      expect(options.style.height).toBe("1201px");
    }
  });

  it("두 번 그리는 동안 같은 옵션을 씁니다 — 배치와 그리기가 어긋나면 안 됩니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(fakeNode());

    const [first, second] = mocks.toPng.mock.calls;
    expect(first?.[1]).toEqual(second?.[1]);
  });

  it("글꼴 CSS는 한 번만 만들고 다시 씁니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    mocks.toPng.mockResolvedValue("data:image/png;base64,ANY");

    await captureNodeAsPng(fakeNode());
    await captureNodeAsPng(fakeNode());

    // 파일이 커서 매번 다시 만들면 저장이 눈에 띄게 느려집니다.
    expect(mocks.getFontEmbedCSS).toHaveBeenCalledTimes(1);
  });

  it("만든 글꼴 CSS를 캡처 옵션에 실어 보냅니다", async () => {
    const { captureNodeAsPng } = await import("@/features/result/captureNode");
    await captureNodeAsPng(fakeNode());

    const options = mocks.toPng.mock.calls[0]?.[1] as { fontEmbedCSS: string };
    expect(options.fontEmbedCSS).toBe("@font-face{font-family:test}");
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
