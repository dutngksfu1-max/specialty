import Link from "next/link";

import { BRAND_NAME } from "@/lib/siteCopy";

/**
 * Header — 텍스트 워드마크 + 아주 얇은 하단선 (docs/design.md 12장, DEC-025 초안 A안)
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-(--container-landing) items-center px-5 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="rounded-sm text-h3 font-bold tracking-[-0.01em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {BRAND_NAME}
        </Link>
      </div>
    </header>
  );
}
