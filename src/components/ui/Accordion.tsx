"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Base UI가 키보드와 상태를 맡고, 외형은 프로젝트 토큰으로만 구성합니다. */
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
    <BaseAccordion.Root defaultValue={defaultOpen ? ["content"] : []} className={className}>
      <BaseAccordion.Item value="content" className="border-b border-border last:border-b-0">
        <BaseAccordion.Header>
          <BaseAccordion.Trigger
            className={cn(
              "group flex min-h-12 w-full items-center justify-between gap-4 py-4 text-left",
              "text-h3 text-foreground hover:text-primary-active",
              "focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
            )}
          >
            <span>{summary}</span>
            <Icon
              name="chevron-down"
              className="text-foreground-subtle transition-transform duration-(--motion-base) ease-out-soft group-data-panel-open:rotate-180"
            />
          </BaseAccordion.Trigger>
        </BaseAccordion.Header>
        <BaseAccordion.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-(--motion-base) ease-out-soft data-ending-style:h-0 data-starting-style:h-0">
          <div className="pb-5 text-body text-foreground-muted">{children}</div>
        </BaseAccordion.Panel>
      </BaseAccordion.Item>
    </BaseAccordion.Root>
  );
}
