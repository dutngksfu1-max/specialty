"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { useRef, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const itemClass =
  "flex min-h-11 cursor-default items-center gap-3 px-3 py-2 text-body-sm text-foreground-body outline-hidden select-none " +
  "data-highlighted:bg-primary-soft data-highlighted:text-primary-active data-disabled:text-foreground-disabled";

export function AssessmentMenu({
  onPause,
  onHome,
  onRestart,
  disabled,
}: {
  readonly onPause: () => Promise<boolean>;
  readonly onHome: () => Promise<boolean>;
  readonly onRestart: () => Promise<boolean>;
  readonly disabled: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function restart() {
    setBusy(true);
    const completed = await onRestart();
    setBusy(false);
    if (completed) setRestartOpen(false);
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          ref={triggerRef}
          disabled={disabled}
          aria-label="검사 메뉴"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-label text-foreground-body hover:bg-surface-muted data-pressed:bg-primary-soft"
        >
          <Icon name="menu" />
          <span className="hidden min-[380px]:inline">검사 메뉴</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-40 outline-hidden" sideOffset={8} align="end">
            <Menu.Popup className="w-52 origin-[var(--transform-origin)] rounded-md border border-border-strong bg-surface p-1.5 shadow-elev-2 outline-hidden transition-[opacity,transform] duration-(--motion-base) ease-out-soft data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
              <Menu.Item className={itemClass} onClick={() => void onPause()}>
                <Icon name="pause" /> 잠시 멈추기
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={() => void onHome()}>
                <Icon name="home" /> 처음으로
              </Menu.Item>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item
                className={cn(itemClass, "text-status-danger data-highlighted:bg-accent-soft data-highlighted:text-status-danger")}
                onClick={() => setRestartOpen(true)}
              >
                <Icon name="restart" /> 처음부터 다시
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root
        open={restartOpen}
        onOpenChange={(open) => {
          setRestartOpen(open);
          if (!open) window.requestAnimationFrame(() => triggerRef.current?.focus());
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-sand-950/35 transition-opacity duration-(--motion-scene) data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup
            initialFocus={cancelRef}
            className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-strong bg-surface p-6 shadow-elev-2 transition-[opacity,transform] duration-(--motion-scene) ease-out-soft data-ending-style:translate-y-[calc(-50%+8px)] data-ending-style:opacity-0 data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:opacity-0 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent"><Icon name="warning" /></span>
              <div>
                <Dialog.Title className="text-h2 text-foreground">처음부터 다시 할까요?</Dialog.Title>
                <Dialog.Description className="mt-2 text-body text-foreground-muted">
                  지금까지 고른 답이 모두 지워지고 첫 묶음부터 시작합니다. 이 작업은 되돌릴 수 없어요.
                </Dialog.Description>
              </div>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Dialog.Close ref={cancelRef} className={buttonClasses("secondary", "md")}>취소</Dialog.Close>
              <Button variant="destructive" size="md" disabled={busy} aria-busy={busy} onClick={() => void restart()}>
                {busy ? "처리 중…" : "응답 지우고 다시 시작"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
