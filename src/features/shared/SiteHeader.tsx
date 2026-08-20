import Link from "next/link";

import { BRAND_NAME } from "@/lib/siteCopy";

/**
 * Header — 텍스트 워드마크 + 아주 얇은 하단선 (docs/design.md 12장, DEC-025 초안 A안)
 */
export function SiteHeader() {
  return (
    <header className="w-full py-4 sm:py-5">
      <div className="mx-auto flex max-w-(--container-landing) items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-sm py-2 text-2xl font-extrabold tracking-[-0.025em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:text-3xl"
        >
          {BRAND_NAME}
        </Link>
      </div>
    </header>
  );
}
