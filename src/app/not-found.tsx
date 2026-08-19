import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { SiteHeader } from "@/features/shared/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-20 sm:px-6">
        <h1 className="text-h1 text-foreground">찾으시는 화면이 없어요</h1>
        <p className="mt-3 text-body text-foreground-muted">주소가 바뀌었을 수 있어요.</p>
        <Link href="/" className={buttonClasses("primary", "md", "mt-8")}>
          처음으로
        </Link>
      </main>
    </>
  );
}
