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
          // 여러 페이지로 나눠야 하는 경우:
          // canvas에 이미지를 그린 뒤, 페이지 높이만큼 잘라서 넣습니다.
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx === null) return;

          // 원본 이미지에서 한 페이지에 해당하는 높이(px)를 계산합니다
          const sourcePageHeightPx = (usableHeight / pdfImgHeight) * img.height;
          let yOffset = 0;

          while (yOffset < img.height) {
            const sliceHeight = Math.min(sourcePageHeightPx, img.height - yOffset);

            canvas.width = img.width;
            canvas.height = sliceHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              img,
              0,
              yOffset,
              img.width,
              sliceHeight,
              0,
              0,
              img.width,
              sliceHeight,
            );

            const sliceDataUrl = canvas.toDataURL("image/png");
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
