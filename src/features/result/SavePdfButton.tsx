"use client";

import { useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  captureNode,
  revealHiddenAncestors,
  safeFileName,
  type CapturedNode,
  type PrintBlock,
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

/** 한 페이지 안에서 장과 장 사이에 두는 간격 (pt) */
const SECTION_GAP = 18;

/**
 * 페이지 끝에 남겨도 되는 **가장 작은 조각**입니다 (한 페이지 높이에 대한 비율).
 *
 * 남은 자리에 손톱만큼만 밀어 넣으면 종이 끝에 토막이 남습니다. 실제로 장 제목만
 * 1페이지 맨 아래에 떨어지고 본문은 다음 장으로 넘어갔습니다 — 제목이 혼자 남는
 * 전형적인 모양입니다. 이보다 작게 잘릴 바에는 그 조각을 통째로 다음 페이지에서 시작합니다.
 *
 * **남은 자리가 아니라 한 페이지**를 기준으로 재야 합니다. 남은 자리 기준으로 재면
 * 자리가 조금 남았을 때 "그 자리의 80%"라며 작은 토막도 통과시킵니다.
 */
const MIN_CHUNK_RATIO = 0.2;

/**
 * 결과 PDF 다운로드 (클라이언트 전용)
 *
 * 서버로 데이터를 보내지 않습니다. 브라우저 안에서 DOM을 이미지로 캡처한 뒤,
 * jsPDF로 여러 페이지 PDF를 만들어 내려받습니다.
 *
 * **페이지를 채우는 방식** (DEC-067)
 *
 * 예전에는 장 하나에 페이지 하나를 통째로 줬습니다. 「함께 일하는 방식」처럼 짧은 장도
 * 자기 페이지를 차지해서, 40%만 찬 종이가 여러 장 나왔습니다.
 *
 * 지금은 **줄글을 흘리듯 이어 담습니다.** 앞 장이 끝난 자리에서 다음 장을 이어 붙이고,
 * 자리가 모자랄 때만 페이지를 넘깁니다. 넘길 자리는 캡처가 함께 돌려준
 * **덩어리 사이의 빈 곳**에서 고르므로, 카드가 반으로 잘리거나 글줄이 끊기지 않습니다.
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

      /*
        1단계 — 담을 것을 모읍니다.

        본문은 `자세히 보기` 탭 패널 안에 있습니다. 요약 보기를 고른 상태라면 그 패널에
        `hidden`이 붙어 크기가 0이므로, 펼쳐 두지 않으면 빈 페이지만 담깁니다 (DEC-062).
        캡처가 끝나면 아래 finally에서 원래대로 되돌립니다.
      */
      const nodes: HTMLElement[] = [heroNode];
      for (const sectionId of SECTION_IDS) {
        const sectionNode = document.getElementById(sectionId);
        if (sectionNode === null) continue;
        restores.push(revealHiddenAncestors(sectionNode));
        nodes.push(sectionNode);
      }

      /*
        2단계 — 캡처합니다.

        `maxBlockHeight`는 "이보다 작으면 쪼개지 않는다"는 기준입니다. 종이 한 장에
        들어갈 만한 것은 통째로 유지합니다. 캡처는 화면 폭 기준이므로 종이의 세로
        길이를 화면 px로 되돌려 넘깁니다.
      */
      const pieces: CapturedNode[] = [];
      for (const node of nodes) {
        const nodeWidth = Math.max(node.getBoundingClientRect().width, 1);
        const ptPerPx = usableWidth / nodeWidth;
        pieces.push(await captureNode(node, { maxBlockHeight: usableHeight / ptPerPx }));
      }

      // 3단계 — 페이지에 이어 담습니다.
      const slicer = document.createElement("canvas");
      const slicerCtx = slicer.getContext("2d");
      if (slicerCtx === null) throw new Error("canvas 2d context를 얻지 못했습니다.");

      let isFirstPage = true;
      let cursor = PAGE_MARGIN; // 이번 페이지에서 다음 그림이 놓일 y (pt)

      const startPage = () => {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        cursor = PAGE_MARGIN;
      };

      startPage();

      let pieceIndex = 0;
      for (const piece of pieces) {
        const image = await loadImage(piece.dataUrl);
        pieceIndex += 1;
        let sliceIndex = 0;
        // 캡처는 고해상도라 그림 픽셀이 화면 px보다 큽니다. 잘라낼 때 이 배율로 환산합니다.
        const pxPerCss = image.height / Math.max(piece.height, 1);
        const ptPerPx = usableWidth / piece.width;

        let offset = 0; // 이 그림에서 아직 안 담은 시작 y (화면 px)
        let isPieceStart = true;

        while (offset < piece.height - 0.5) {
          const gap = isPieceStart && cursor > PAGE_MARGIN ? SECTION_GAP : 0;
          const availablePx = (A4_HEIGHT - PAGE_MARGIN - cursor - gap) / ptPerPx;
          const remainingPx = piece.height - offset;

          // 남은 게 다 들어가면 그대로 놓고 이 그림을 끝냅니다.
          if (remainingPx <= availablePx) {
            sliceIndex += 1;
            drawSlice(pdf, slicer, slicerCtx, image, {
              offsetPx: offset,
              heightPx: remainingPx,
              pxPerCss,
              yPt: cursor + gap,
              widthPt: usableWidth,
              heightPt: remainingPx * ptPerPx,
              wholeImageUrl: piece.dataUrl,
              alias: `p${pieceIndex}s${sliceIndex}`,
            });
            cursor += gap + remainingPx * ptPerPx;
            break;
          }

          const atPageTop = cursor === PAGE_MARGIN;
          const cut = safeCut(piece.blocks, offset, offset + availablePx);
          const minChunk = (usableHeight / ptPerPx) * MIN_CHUNK_RATIO;

          // 자를 자리가 없거나 토막만 남으면, 이 조각을 새 페이지에서 다시 시도합니다.
          if (!atPageTop && (cut === null || cut - offset < minChunk)) {
            startPage();
            continue;
          }

          /*
            페이지 맨 위인데도 안 들어갑니다 — 덩어리 하나가 종이보다 큽니다.
            이때만 어쩔 수 없이 그어서 나눕니다.
          */
          const sliceHeight = cut === null ? availablePx : cut - offset;
          sliceIndex += 1;
          drawSlice(pdf, slicer, slicerCtx, image, {
            offsetPx: offset,
            heightPx: sliceHeight,
            pxPerCss,
            yPt: cursor + gap,
            widthPt: usableWidth,
            heightPt: sliceHeight * ptPerPx,
            wholeImageUrl: piece.dataUrl,
            alias: `p${pieceIndex}s${sliceIndex}`,
          });
          offset += sliceHeight;
          isPieceStart = false;
          startPage();
        }
      }

      // 4단계: PDF 파일 저장
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
 * `from` 아래이면서 `limit`을 넘지 않는, **가장 아래쪽 자를 수 있는 자리**를 찾습니다 (DEC-067).
 *
 * 자를 수 있는 자리는 어떤 덩어리의 몸통도 지나지 않는 y입니다. 후보는 덩어리들의
 * 아래 모서리와 `limit` 자신입니다 — 그 사이를 더 촘촘히 볼 이유가 없습니다.
 * 하나도 없으면 `null`을 돌려줍니다. 부르는 쪽이 페이지를 넘길지 그어서 나눌지 정합니다.
 */
export function safeCut(
  blocks: readonly PrintBlock[],
  from: number,
  limit: number,
): number | null {
  if (blocks.length === 0) return limit;

  // 0.5px은 반올림 오차를 위한 여유입니다. 모서리에 딱 붙은 값을 "지난다"고 보지 않습니다.
  const crosses = (y: number) =>
    blocks.some((block) => block.top < y - 0.5 && block.bottom > y + 0.5);

  const candidates = [limit];
  for (const block of blocks) {
    if (block.bottom > from && block.bottom <= limit) candidates.push(block.bottom);
  }
  candidates.sort((a, b) => b - a);

  for (const candidate of candidates) {
    if (candidate <= from) continue;
    if (!crosses(candidate)) return candidate;
  }
  return null;
}

/**
 * 캡처한 그림에서 한 조각만 잘라 종이에 놓습니다.
 *
 * jsPDF는 넣은 그림을 페이지 밖으로 잘라 주지 않습니다. 그래서 그림 전체를 넣고
 * 위로 밀어 올리면 **다음 페이지에 갈 부분까지 같은 종이에 찍힙니다.**
 * 필요한 만큼만 canvas로 잘라 넣어야 합니다.
 */
/** jsPDF에서 이 파일이 쓰는 부분만 추립니다. 메서드 문법이라야 jsPDF 인스턴스가 그대로 들어갑니다. */
interface PdfLike {
  addImage(
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
    alias?: string,
    compression?: "NONE" | "FAST" | "MEDIUM" | "SLOW",
  ): void;
}

function drawSlice(
  pdf: PdfLike,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    offsetPx,
    heightPx,
    pxPerCss,
    yPt,
    widthPt,
    heightPt,
    wholeImageUrl,
    alias,
  }: {
    readonly offsetPx: number;
    readonly heightPx: number;
    readonly pxPerCss: number;
    readonly yPt: number;
    readonly widthPt: number;
    readonly heightPt: number;
    /** 그림 전체를 그대로 쓰는 경우의 원본 URL. canvas를 한 번 덜 거칩니다 */
    readonly wholeImageUrl?: string;
    readonly alias: string;
  },
): void {
  const sourceY = Math.round(offsetPx * pxPerCss);
  const sourceHeight = Math.min(Math.round(heightPx * pxPerCss), image.height - sourceY);
  if (sourceHeight <= 0) return;

  const coversWholeImage = sourceY === 0 && sourceHeight === image.height;
  let data: string;
  if (coversWholeImage && wholeImageUrl !== undefined) {
    data = wholeImageUrl;
  } else {
    canvas.width = image.width;
    canvas.height = sourceHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, sourceY, image.width, sourceHeight, 0, 0, image.width, sourceHeight);
    data = canvas.toDataURL("image/png");
  }

  /*
    `"FAST"`를 빼면 jsPDF가 그림을 **압축하지 않고** 원시 픽셀 그대로 담습니다.
    A4 다섯 장짜리가 65MB로 나왔습니다. 압축을 켜면 같은 화질로 크게 줄어듭니다.
    `alias`는 같은 그림을 두 번 담지 않게 하는 이름표입니다.
  */
  pdf.addImage(data, "PNG", PAGE_MARGIN, yPt, widthPt, heightPt, alias, "FAST");
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
