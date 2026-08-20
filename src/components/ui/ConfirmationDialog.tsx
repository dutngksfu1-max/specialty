"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";

import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function ConfirmationDialog({
  triggerLabel,
  triggerIcon,
  triggerVariant = "secondary",
  triggerSize = "md",
  triggerClassName,
  title,
  description,
  confirmLabel,
  onConfirm,
  disabled = false,
}: {
  readonly triggerLabel: string;
  readonly triggerIcon?: IconName;
  readonly triggerVariant?: ButtonVariant;
  readonly triggerSize?: ButtonSize;
  readonly triggerClassName?: string;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => Promise<boolean>;
  readonly disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function confirm() {
    setBusy(true);
    const shouldClose = await onConfirm();
    setBusy(false);
    if (shouldClose) setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        disabled={disabled}
        className={buttonClasses(triggerVariant, triggerSize, triggerClassName)}
      >
        {triggerIcon !== undefined && <Icon name={triggerIcon} />}
        {triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-sand-950/35 transition-opacity duration-(--motion-scene) data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          initialFocus={cancelRef}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border-strong bg-surface p-6 shadow-elev-2 sm:p-8",
            "transition-[opacity,transform] duration-(--motion-scene) ease-out-soft",
            "data-ending-style:translate-y-[calc(-50%+8px)] data-ending-style:opacity-0",
            "data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:opacity-0",
          )}
        >
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
              <Icon name="warning" />
            </span>
            <div>
              <Dialog.Title className="text-h2 text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-body text-foreground-muted">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close ref={cancelRef} className={buttonClasses("secondary", "md")}>취소</Dialog.Close>
            <Button variant="destructive" size="md" disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
              {busy ? "처리 중…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
