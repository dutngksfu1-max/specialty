"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getResult } from "@/application/assessment/getResult";
import { buttonClasses } from "@/components/ui/Button";
import { displayNickname } from "@/domain/assessment/session/nickname";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor, type ErrorMessage } from "@/lib/errorMessages";
import { DISCLAIMER } from "@/lib/siteCopy";

type State =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly nickname: string; readonly completedAt: string }
  | { readonly kind: "failed"; readonly message: ErrorMessage };

/**
 * Phase 3에서 진짜 결과 화면으로 교체됩니다.
 *
 * 지금은 채점·저장이 끝났다는 것만 알려 줍니다.
 * 결과 키(resultKey)는 내부 식별자이므로 화면에 절대 출력하지 않습니다.
 */
export function ResultPlaceholder({ slug }: { readonly slug: string }) {
  const services = useAssessmentServices();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (services === null) return;
    let alive = true;

    void getResult(services.deps, { slug }).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setState({
          kind: "ready",
          nickname: displayNickname(result.value.snapshot.nickname),
          completedAt: result.value.snapshot.completedAt,
        });
        return;
      }
      setState({ kind: "failed", message: messageFor(result.error) });
    });

    return () => {
      alive = false;
    };
  }, [services, slug]);

  return (
    <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-16 sm:px-6">
      {state.kind === "loading" && (
        <p className="text-body text-foreground-muted" aria-live="polite">
          결과를 불러오는 중이에요…
        </p>
      )}

      {state.kind === "failed" && (
        <>
          <h1 className="text-h1 text-foreground">{state.message.title}</h1>
          <p className="mt-3 text-body text-foreground-muted">{state.message.body}</p>
          <Link href={`/assessments/${slug}`} className={buttonClasses("primary", "md", "mt-8")}>
            검사 소개로 가기
          </Link>
        </>
      )}

      {state.kind === "ready" && (
        <>
          <p className="text-body-sm text-foreground-subtle">
            {new Date(state.completedAt).toLocaleDateString("ko-KR")}
          </p>
          <h1 className="mt-2 text-h1 text-foreground sm:text-h1-lg">
            {state.nickname}님, 검사를 마쳤어요
          </h1>
          <p className="mt-4 max-w-prose text-body-lg text-foreground-muted">
            응답이 모두 저장되고 채점까지 끝났습니다. 결과를 읽는 화면은 다음 단계에서 만들어져요.
          </p>

          <p className="mt-8 max-w-prose text-body-sm text-foreground-muted">
            <span aria-hidden="true">ℹ </span>
            {DISCLAIMER}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className={buttonClasses("secondary", "md")}>
              처음으로
            </Link>
            <Link href={`/assessments/${slug}`} className={buttonClasses("ghost", "md")}>
              검사 소개 보기
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
