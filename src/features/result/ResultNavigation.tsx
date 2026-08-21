"use client";

import { useEffect, useState } from "react";

export interface ResultNavigationItem {
  readonly href: string;
  readonly number: string;
  readonly label: string;
}

/**
 * 결과 목차 (DEC-045)
 *
 * 스크롤을 따라오는 방식은 **CSS `position: sticky`** 입니다.
 * scroll 이벤트로 좌표를 계산해 옮기면 렌더가 한 박자 늦어 흔들리는데,
 * sticky는 브라우저 합성 단계에서 처리하므로 원리상 끊기지 않습니다.
 *
 * 지금 보고 있는 장이 어디인지는 **IntersectionObserver**로 압니다.
 * 이것도 scroll 이벤트를 쓰지 않으므로 스크롤 성능에 영향을 주지 않습니다.
 *
 * sticky가 동작하려면 **부모 칸이 본문만큼 높아야** 합니다.
 * 그리드에 `items-start`가 붙어 있으면 칸이 목차 높이로 줄어들어 움직일 공간이 사라집니다.
 */
export function ResultNavigation({
  items,
}: {
  readonly items: readonly ResultNavigationItem[];
}) {
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = `#${entry.target.id}`;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }

        // 화면 위쪽 띠에 걸친 것 중 문서 순서로 가장 앞선 장을 지금 보는 장으로 봅니다.
        const current = items.find((item) => visible.has(item.href));
        // 장과 장 사이 여백에서는 아무것도 걸리지 않습니다. 이때는 직전 값을 유지합니다.
        if (current !== undefined) setActiveHref(current.href);
      },
      {
        // 뷰포트 위에서 20~40% 되는 얇은 띠만 봅니다.
        // 시선이 머무는 높이라, 사람이 "지금 읽는 곳"이라고 느끼는 지점과 맞습니다.
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const section of sections) observer.observe(section);

    // 문서 끝에서는 마지막 장이 띠에 닿지 못할 수 있습니다. 그때는 마지막 장을 켭니다.
    const markLastAtBottom = () => {
      const reachedBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      const last = items[items.length - 1];
      if (reachedBottom && last !== undefined) setActiveHref(last.href);
    };
    window.addEventListener("scrollend", markLastAtBottom);

    return () => {
      observer.disconnect();
      window.removeEventListener("scrollend", markLastAtBottom);
    };
  }, [items]);

  return (
    <nav
      aria-label="결과 내용 바로가기"
      className="rounded-lg border border-border bg-surface lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
    >
      <p className="border-b border-border px-4 py-3 text-caption font-semibold text-foreground-subtle">
        결과 순서
      </p>
      <ol className="grid grid-cols-2 lg:grid-cols-1">
        {items.map((item, index) => {
          const isActive = item.href === activeHref;
          return (
            <li
              key={item.href}
              className={`${index >= 2 ? "border-t border-border" : ""} ${index % 2 === 1 ? "border-l border-border lg:border-l-0" : ""} ${index > 0 ? "lg:border-t lg:border-border" : ""}`}
            >
              <a
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={`relative flex min-h-12 items-center gap-3 px-4 py-3 text-body-sm font-medium transition-colors duration-(--motion-fast) ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  isActive
                    ? "bg-primary-soft font-bold text-primary-active"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {/* 지금 보는 장을 색만으로 알리지 않도록 왼쪽에 표시를 함께 둡니다. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-1 left-0 w-0.5 rounded-full ${isActive ? "bg-primary" : "bg-transparent"}`}
                />
                <span className="font-bold tabular-nums text-accent" aria-hidden="true">
                  {item.number}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
