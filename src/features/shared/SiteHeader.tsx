import Link from "next/link";

import { BRAND_NAME } from "@/lib/siteCopy";

/**
 * Header — 텍스트 워드마크 + 아주 얇은 하단선 (docs/design.md 12장, DEC-025 초안 A안)
 */
export function SiteHeader() {
  return (
    <header className="w-full pt-6 pb-2">
      <div className="mx-auto flex justify-center items-center px-5 sm:px-6">
        <Link
          href="/"
          className="rounded-full px-4 py-2 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {BRAND_NAME}
        </Link>
      </div>
    </header>
  );
}
