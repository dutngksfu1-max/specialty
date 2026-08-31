"use client";

import { useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  captureNodeAsPng,
  revealHiddenAncestors,
  safeFileName,
} from "@/features/result/captureNode";

type State = "idle" | "working" | "failed";

/**
 * PDF에 넣을 각 섹션의 id 목록입니다.
 *
 * 결과 화면에 이미 존재하는 id를 활용합니다.
 * Hero 영역은 별도 ref로 처리하고, 나머지 본문 섹션은 id로 찾습니다.
 */
const SECTION_IDS = [
  "result-overview",
  "result-scenes",
  "result-collaboration",
  "result-next",
] as const;

/**
 * A4 크기 (pt 단위, jsPDF 기본)
 *
 * jsPDF는 포인트(pt) 단위를 사용합니다.
 * A4 = 595.28 × 841.89pt
 */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 30; // 상하좌우 여백 (pt)

/**
 * 결과 PDF 다운로드 (클라이언트 전용)
 *
 * 서버로 데이터를 보내지 않습니다. 브라우저 안에서 DOM을 이미지로 캡처한 뒤,
 * jsPDF로 여러 페이지 PDF를 만들어 내려받습니다.
 *
 * 전략:
 *   1. Hero 영역 → 이미지 캡처 → PDF 1페이지
 *   2. 각 본문 섹션(#result-overview 등) → 이미지 캡처 → 필요하면 페이지 분할
 *   3. 한 섹션의 이미지가 A4 높이를 넘으면 자동으로 여러 페이지에 나눠 넣습니다
 */
export function SavePdfButton({
  heroRef,
  nickname,
}: {
  /** Hero 영역 (ResultHero의 header 요소) */
  readonly heroRef: RefObject<HTMLElement | null>;
  readonly nickname: string;
}) {
  const [state, setState] = useState<State>("idle");

  async function save() {
    const heroNode = heroRef.current;
    if (heroNode === null) return;

    setState("working");
    /** 캡처하려고 펼친 탭 패널을 되돌리는 함수들 */
    const restores: (() => void)[] = [];
    try {
      // jsPDF를 동적으로 import합니다.
      // 왜: PDF 다운로드를 누르지 않는 사용자에게 ~80KB를 로드하지 않기 위해서입니다.
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const usableWidth = A4_WIDTH - PAGE_MARGIN * 2;
      const usableHeight = A4_HEIGHT - PAGE_MARGIN * 2;
      let isFirstPage = true;

      /**
       * DOM 노드를 PNG로 캡처 → PDF 페이지에 삽입합니다.
       *
       * 이미지 높이가 A4 한 페이지를 넘으면, 이미지를 잘라서
       * 여러 페이지에 나눠 넣습니다 (누락·겹침 없이).
       */
      async function addNodeToPdf(node: HTMLElement) {
        // 글꼴 대기·2회 렌더·크기 고정은 captureNodeAsPng이 담당합니다 (DEC-058).
        const dataUrl = await captureNodeAsPng(node);

        // 이미지 원본 크기를 알아내기 위해 Image 객체를 사용합니다
        const img = await loadImage(dataUrl);
        const imgAspect = img.width / img.height;

        // PDF에서의 이미지 폭은 사용 가능한 영역에 맞춥니다
        const pdfImgWidth = usableWidth;
        const pdfImgHeight = pdfImgWidth / imgAspect;

        if (pdfImgHeight <= usableHeight) {
          // 한 페이지에 들어가는 경우
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;
          pdf.addImage(dataUrl, "PNG", PAGE_MARGIN, PAGE_MARGIN, pdfImgWidth, pdfImgHeight);
        } else {
          /*
            여러 페이지로 나눠야 하는 경우 (DEC-066).

            예전에는 페이지 높이만큼 **기계적으로** 잘랐습니다. 자르는 자리가 하필 글줄
            한가운데면 글자의 위 절반은 앞 페이지에, 아래 절반은 다음 페이지에 남아
            둘 다 못 읽는 글이 됩니다. 그래서 자를 자리를 **빈 줄에서 고릅니다.**
          */
          const source = document.createElement("canvas");
          const sourceCtx = source.getContext("2d");
          if (sourceCtx === null) return;
          source.width = img.width;
          source.height = img.height;
          sourceCtx.drawImage(img, 0, 0);

          const inkRows = findInkRows(sourceCtx, img.width, img.height);

          const slice = document.createElement("canvas");
          const sliceCtx = slice.getContext("2d");
          if (sliceCtx === null) return;

          // 원본 이미지에서 한 페이지에 해당하는 높이(px)를 계산합니다
          const sourcePageHeightPx = (usableHeight / pdfImgHeight) * img.height;
          let yOffset = 0;

          while (yOffset < img.height) {
            const sliceHeight = nextSliceHeight(
              inkRows,
              yOffset,
              sourcePageHeightPx,
              img.height,
            );

            slice.width = img.width;
            slice.height = sliceHeight;
            sliceCtx.clearRect(0, 0, slice.width, slice.height);
            sliceCtx.drawImage(
              source,
              0,
              yOffset,
              img.width,
              sliceHeight,
              0,
              0,
              img.width,
              sliceHeight,
            );

            const sliceDataUrl = slice.toDataURL("image/png");
            const slicePdfHeight = (sliceHeight / img.width) * pdfImgWidth;

            if (!isFirstPage) pdf.addPage();
            isFirstPage = false;
            pdf.addImage(sliceDataUrl, "PNG", PAGE_MARGIN, PAGE_MARGIN, pdfImgWidth, slicePdfHeight);

            yOffset += sliceHeight;
          }
        }
      }

      // 1단계: Hero 캡처 → 첫 페이지
      await addNodeToPdf(heroNode);

      /*
        2단계: 본문 섹션들을 순서대로 캡처 → 이어지는 페이지들

        본문은 `자세히 보기` 탭 패널 안에 있습니다. 요약 보기를 고른 상태라면 그 패널에
        `hidden`이 붙어 크기가 0이므로, 펼쳐 두지 않으면 빈 페이지만 담깁니다 (DEC-062).
        캡처가 끝나면 아래 finally에서 원래대로 되돌립니다.
      */
      for (const sectionId of SECTION_IDS) {
        const sectionNode = document.getElementById(sectionId);
        if (sectionNode === null) continue;
        restores.push(revealHiddenAncestors(sectionNode));
        await addNodeToPdf(sectionNode);
      }

      // 3단계: PDF 파일 저장
      pdf.save(`${safeFileName(nickname)}-결과.pdf`);

      setState("idle");
    } catch {
      setState("failed");
    } finally {
      for (const restore of restores) restore();
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        disabled={state === "working"}
        aria-busy={state === "working"}
        className="w-full border-accent bg-accent-soft text-accent-strong hover:bg-accent sm:w-auto"
        onClick={() => void save()}
      >
        {state !== "working" && <Icon name="download" />}
        {state === "working" ? "PDF 만드는 중이에요…" : "PDF 다운로드"}
      </Button>

      <p className="mt-2 text-caption text-foreground-subtle" aria-live="polite">
        {state === "working" ? "결과 전체를 PDF로 만들고 있어요. 잠시만 기다려 주세요." : ""}
      </p>

      {state === "failed" && (
        <p className="mt-1 text-body-sm text-status-danger" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          PDF를 만들지 못했어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}

/**
 * 가로 한 줄마다 "글자나 그림이 있는가"를 표시합니다 (DEC-066).
 *
 * 페이지를 나눌 때 **글줄 한가운데를 자르지 않으려고** 씁니다.
 *
 * 판정은 그 줄이 얼마나 **얼룩덜룩한가**로 합니다. 배경은 가로로 고르고,
 * 글자가 있으면 밝고 어두운 점이 수백 개 섞입니다. 카드 테두리처럼 점 두어 개만
 * 다른 줄은 자를 수 있는 줄로 봅니다 — 테두리를 지나며 잘라도 읽는 데 지장이 없습니다.
 */
function findInkRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Uint8Array {
  const rows = new Uint8Array(height);
  const { data } = ctx.getImageData(0, 0, width, height);
  /** 이만큼(가로 픽셀의 0.6%)보다 많이 튀는 점이 있으면 글줄로 봅니다. */
  const inkThreshold = Math.max(4, Math.round(width * 0.006));

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * 4;
    // 줄 맨 왼쪽 점을 그 줄의 바탕색으로 삼습니다. 카드 안팎 모두 왼쪽 끝은 배경입니다.
    const baseR = data[rowStart] ?? 0;
    const baseG = data[rowStart + 1] ?? 0;
    const baseB = data[rowStart + 2] ?? 0;
    let offCount = 0;

    for (let x = 0; x < width; x += 1) {
      const i = rowStart + x * 4;
      const delta =
        Math.abs((data[i] ?? 0) - baseR) +
        Math.abs((data[i + 1] ?? 0) - baseG) +
        Math.abs((data[i + 2] ?? 0) - baseB);
      if (delta > 60) {
        offCount += 1;
        if (offCount > inkThreshold) break;
      }
    }
    rows[y] = offCount > inkThreshold ? 1 : 0;
  }

  return rows;
}

/**
 * 다음 페이지에 담을 높이를 정합니다 (DEC-066).
 *
 * 한 페이지 높이에서 시작해 **위로 올라가며 빈 줄을 찾습니다.** 찾으면 거기서 자르고,
 * 한참 올라가도 빈 줄이 없으면(큰 그림 한 장이 페이지를 가득 채운 경우) 원래 자리에서 자릅니다.
 * 너무 짧게 잘려 종이가 헐렁해지지 않도록 페이지의 절반 아래로는 내려가지 않습니다.
 */
function nextSliceHeight(
  inkRows: Uint8Array,
  yOffset: number,
  pageHeightPx: number,
  imageHeight: number,
): number {
  const remaining = imageHeight - yOffset;
  if (remaining <= pageHeightPx) return remaining;

  const target = Math.floor(yOffset + pageHeightPx);
  const lowest = Math.floor(yOffset + pageHeightPx * 0.5);

  for (let y = Math.min(target, imageHeight - 1); y > lowest; y -= 1) {
    if (inkRows[y] === 0) return y - yOffset;
  }

  return Math.floor(pageHeightPx);
}

/**
 * data URL을 HTMLImageElement로 로드합니다.
 *
 * 왜: 이미지의 원본 크기(width, height)를 알아야
 * PDF 페이지 분할 계산을 할 수 있기 때문입니다.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
