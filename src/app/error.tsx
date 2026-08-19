"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

/**
 * 예상하지 못한 오류 (docs/architecture.md 8.2)
 *
 * 기술 오류 문자열을 화면에 노출하지 않습니다. 개발 모드에서만 콘솔에 남깁니다.
 */
export default function RouteError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-20 sm:px-6">
      <h1 className="text-h1 text-foreground">잠시 문제가 생겼어요</h1>
      <p className="mt-3 text-body text-foreground-muted">
        지금까지 답한 내용은 이 브라우저에 그대로 저장되어 있어요. 다시 시도해 주세요.
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="primary" size="md" onClick={reset}>
          다시 시도
        </Button>
        <Button variant="secondary" size="md" onClick={() => router.push("/")}>
          처음으로
        </Button>
      </div>
    </main>
  );
}
