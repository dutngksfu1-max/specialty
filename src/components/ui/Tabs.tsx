"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * 두 갈래 보기 전환 (요약 / 자세히)
 *
 * Base UI가 role·화살표 키 이동·포커스를 맡고, 외형은 프로젝트 토큰으로만 만듭니다.
 * 선택 상태를 색으로만 알리지 않도록 면·테두리·굵기를 함께 바꿉니다 (design.md 5장).
 */
export interface SegmentedTabItem {
  readonly value: string;
  readonly label: string;
  /** 라벨 아래 한 마디 — 예상 분량처럼 고르는 데 도움이 되는 것만 넣습니다 */
  readonly hint?: string;
}

export function SegmentedTabs({
  label,
  items,
  value,
  onValueChange,
  className,
  children,
}: {
  /** 탭 묶음의 이름. 화면에는 보이지 않고 보조기기가 읽습니다 */
  readonly label: string;
  readonly items: readonly SegmentedTabItem[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <BaseTabs.Root
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className={className}
    >
      <BaseTabs.List
        aria-label={label}
        className="flex w-full max-w-md min-w-0 items-stretch gap-1 rounded-md border border-border bg-surface-muted p-1"
      >
        {items.map((item) => (
          <BaseTabs.Tab
            key={item.value}
            value={item.value}
            className={cn(
              "min-h-11 min-w-0 flex-1 rounded-sm px-3 py-2 text-body-sm font-medium text-foreground-muted",
              "transition-[background-color,border-color,color] duration-(--motion-fast) ease-out-soft",
              "hover:text-foreground",
              "aria-selected:border aria-selected:border-border-strong aria-selected:bg-surface",
              "aria-selected:font-semibold aria-selected:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
            )}
          >
            <span className="block truncate">{item.label}</span>
            {item.hint !== undefined && (
              <span className="mt-0.5 block truncate text-caption font-normal text-foreground-muted">
                {item.hint}
              </span>
            )}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {children}
    </BaseTabs.Root>
  );
}

/**
 * 선택되지 않은 패널도 DOM에 남깁니다(`keepMounted`).
 *
 * 탭을 오갈 때 카드와 차트를 다시 만들지 않아 전환이 즉시 끝나고 스크롤이 튀지 않습니다.
 * 숨김은 `hidden` 속성이라 화면에는 보이지 않습니다 — 브라우저 찾기(Ctrl+F)에도 걸리지 않으므로,
 * 자세히 보기의 내용을 요약에서 찾을 수 있다고 기대하게 만들면 안 됩니다.
 */
export function TabPanel({
  value,
  className,
  children,
}: {
  readonly value: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <BaseTabs.Panel value={value} keepMounted className={className}>
      {children}
    </BaseTabs.Panel>
  );
}
