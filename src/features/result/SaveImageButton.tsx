"use client";

import { getFontEmbedCSS, toPng } from "html-to-image";
import { useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "@/features/result/ResultShareCard";

type State = "idle" | "working" | "failed";

/**
 * 폰트를 이미지 안에 심는 CSS는 한 번만 만들고 재사용합니다.
 *
 * 캡처된 그림은 브라우저 문서와 분리된 공간에서 그려지기 때문에,
 * 폰트를 이미지 안에 함께 넣지 않으면 저장된 그림만 시스템 기본 글꼴로 나옵니다.
 * Pretendard 파일이 크므로 이 작업이 가장 오래 걸립니다 — 두 번째 저장부터는 즉시 끝납니다.
 */
let cachedFontEmbedCss: string | null = null;

/** 파일명에 쓸 수 없는 문자를 걸러 냅니다. */
function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned.length === 0 ? "결과" : cleaned;
}

/**
 * 결과 이미지 저장 (PRD F-5.4, DEC-008, docs/design.md 11.3)
 *
 * 네트워크를 쓰지 않습니다. 브라우저 안에서 DOM을 그대로 PNG로 바꿔 내려받습니다.
 * 그래서 강의실 와이파이가 끊겨도 동작합니다.
 */
export function SaveImageButton({
  targetRef,
  nickname,
}: {
  readonly targetRef: RefObject<HTMLDivElement | null>;
  readonly nickname: string;
}) {
  const [state, setState] = useState<State>("idle");

  async function save() {
    const node = targetRef.current;
    if (node === null) return;

    setState("working");
    try {
      if (cachedFontEmbedCss === null) {
        cachedFontEmbedCss = await getFontEmbedCSS(node, { preferredFontFormat: "woff2" });
      }

      const dataUrl = await toPng(node, {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        pixelRatio: 1,
        cacheBust: false,
        fontEmbedCSS: cachedFontEmbedCss,
        preferredFontFormat: "woff2",
        backgroundColor: window.getComputedStyle(node).backgroundColor,
        // 캡처 대상은 화면 밖(fixed, left:-20000px)에 있습니다.
        // 복제본에서는 그 위치를 지워야 그림 안에 제대로 담깁니다.
        style: {
          position: "static",
          left: "0px",
          top: "0px",
          margin: "0px",
          transform: "none",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${safeFileName(nickname)}-결과.png`;
      link.click();

      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <div>
      <Button
        variant="primary"
        size="lg"
        disabled={state === "working"}
        aria-busy={state === "working"}
        className="w-full sm:w-auto"
        onClick={() => void save()}
      >
        {state !== "working" && <Icon name="device" />}
        {state === "working" ? "이미지 만드는 중이에요…" : "결과 이미지 저장"}
      </Button>

      <p className="mt-2 text-caption text-foreground-subtle" aria-live="polite">
        {state === "working" ? "글꼴까지 그림에 담고 있어서 몇 초 걸릴 수 있어요." : ""}
      </p>

      {state === "failed" && (
        <p className="mt-1 text-body-sm text-status-danger" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          이미지를 만들지 못했어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}
