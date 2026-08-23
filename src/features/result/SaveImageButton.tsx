"use client";

import { useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { captureNodeAsPng, safeFileName } from "@/features/result/captureNode";

type State = "idle" | "working" | "failed";

/**
 * 결과 이미지 저장 (PRD F-5.4, DEC-008, docs/design.md 11.3)
 *
 * 네트워크를 쓰지 않습니다. 브라우저 안에서 DOM을 그대로 PNG로 바꿔 내려받습니다.
 * 그래서 강의실 와이파이가 끊겨도 동작합니다.
 *
 * 캡처 대상은 화면에 보이는 ResultHero(상단 카드) 영역입니다.
 * 화면 밖 전용 카드가 아니라 실제 보이는 Hero를 캡처하여
 * "보이는 그대로" PNG로 저장합니다.
 */
export function SaveImageButton({
  targetRef,
  nickname,
}: {
  /** 캡처 대상 — 화면에 보이는 ResultHero의 header 요소 */
  readonly targetRef: RefObject<HTMLElement | null>;
  readonly nickname: string;
}) {
  const [state, setState] = useState<State>("idle");

  async function save() {
    const node = targetRef.current;
    if (node === null) return;

    setState("working");
    try {
      // 화면에 보이는 Hero 요소를 그대로 캡처합니다.
      // 글꼴 대기·2회 렌더·크기 고정은 captureNodeAsPng이 담당합니다 (DEC-058).
      const dataUrl = await captureNodeAsPng(node);

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
        size="sm"
        disabled={state === "working"}
        aria-busy={state === "working"}
        className="w-full sm:w-auto"
        onClick={() => void save()}
      >
        {state !== "working" && <Icon name="device" />}
        {state === "working" ? "이미지 만드는 중이에요…" : "이미지(PNG) 저장"}
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
