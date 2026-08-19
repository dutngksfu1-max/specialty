import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Accordion — 네이티브 `<details>` / `<summary>`를 씁니다.
 *
 * 왜 직접 만들지 않았나요?
 * 브라우저가 이미 키보드 조작·스크린리더 안내·펼침 상태를 정확히 처리해 줍니다.
 * div로 흉내 내면 그걸 전부 다시 만들어야 하고, 대개 어딘가 빠집니다.
 *
 * Modal이 아니라 Accordion인 이유는 docs/design.md 16장(금지 패턴 15번)입니다.
 */
export function Accordion({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  readonly summary: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group border-b border-border last:border-b-0", className)}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4",
          "text-h3 text-foreground marker:hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{summary}</span>
        <span
          aria-hidden="true"
          className="shrink-0 text-foreground-subtle transition-transform duration-[180ms] ease-in-out-soft group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="pb-4 text-body text-foreground-muted">{children}</div>
    </details>
  );
}
